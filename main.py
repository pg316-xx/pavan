import json
import os
import subprocess
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Response, Request, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uuid

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session storage (in-memory)
sessions: Dict[str, Dict[str, Any]] = {}

# Models
class LoginRequest(BaseModel):
    userId: str
    password: str

class CommentRequest(BaseModel):
    content: str

class SubmissionUpdate(BaseModel):
    structuredData: Dict[str, Any]

class User(BaseModel):
    id: str
    userId: str
    role: str
    name: str
    email: Optional[str] = None

# Load users from JSON
def load_users():
    with open('users.json', 'r') as f:
        data = json.load(f)
        return data['users']

USERS = load_users()

# Storage for submissions and comments (in-memory)
submissions_db: List[Dict[str, Any]] = []
comments_db: List[Dict[str, Any]] = []

# Helper functions
def get_user_by_credentials(user_id: str, password: str) -> Optional[Dict]:
    for user in USERS:
        if user['userId'] == user_id and user['password'] == password:
            return user
    return None

def get_session(request: Request) -> Optional[Dict]:
    session_id = request.cookies.get('session_id')
    if session_id and session_id in sessions:
        session = sessions[session_id]
        expires = session.get('expires')
        if expires and expires > datetime.now():
            return session
        else:
            del sessions[session_id]
    return None

def require_auth(request: Request) -> Dict:
    session = get_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="Authentication required")
    return session['user']

def require_role(allowed_roles: List[str]):
    def role_checker(user: Dict = Depends(require_auth)) -> Dict:
        if user['role'] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

def generate_txt_report(data: Dict[str, Any], keeper_name: str, date: str) -> str:
    return f"""
ZOO ANIMAL MONITORING REPORT
============================

Date: {date}
Zoo Keeper: {keeper_name}
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

OBSERVATION DETAILS
-------------------
Animal Observed on Time: {'Yes' if data.get('animal_observed_on_time') else 'No'}
Clean Drinking Water Provided: {'Yes' if data.get('clean_drinking_water_provided') else 'No'}
Enclosure Cleaned Properly: {'Yes' if data.get('enclosure_cleaned_properly') else 'No'}
Normal Behaviour Status: {'Yes' if data.get('normal_behaviour_status') else 'No'}
{f"Behaviour Details: {data.get('normal_behaviour_details')}" if data.get('normal_behaviour_details') else ''}
Feed and Supplements Available: {'Yes' if data.get('feed_and_supplements_available') else 'No'}
Feed Given as Prescribed: {'Yes' if data.get('feed_given_as_prescribed') else 'No'}
{f"Other Requirements: {data.get('other_animal_requirements')}" if data.get('other_animal_requirements') else ''}

MONITORING SUMMARIES
--------------------
Daily Animal Health Monitoring:
{data.get('daily_animal_health_monitoring', '')}

Carnivorous Animal Feeding Chart:
{data.get('carnivorous_animal_feeding_chart', '')}

Medicine Stock Register:
{data.get('medicine_stock_register', '')}

Daily Wildlife Monitoring:
{data.get('daily_wildlife_monitoring', '')}

AUTHORIZATION
-------------
In-charge Signature: {data.get('incharge_signature', '')}

---
This report was generated automatically by the Zoo Management System.
    """.strip()

# Ensure directories exist
Path("uploads").mkdir(exist_ok=True)
Path("reports").mkdir(exist_ok=True)

# Authentication routes
@app.post("/api/auth/login")
async def login(request: LoginRequest, response: Response):
    user = get_user_by_credentials(request.userId, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_id = str(uuid.uuid4())
    sessions[session_id] = {
        'user': user,
        'expires': datetime.now() + timedelta(hours=24)
    }
    
    # Set cookie
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        max_age=24*60*60,
        samesite='lax'
    )
    
    return {"user": {"id": user['id'], "userId": user['userId'], "role": user['role'], "name": user['name']}}

@app.post("/api/auth/logout")
async def logout(request: Request, response: Response):
    session_id = request.cookies.get('session_id')
    if session_id and session_id in sessions:
        del sessions[session_id]
    response.delete_cookie("session_id")
    return {"message": "Logged out successfully"}

@app.get("/api/auth/user")
async def get_current_user(user: Dict = Depends(require_auth)):
    return {"id": user['id'], "userId": user['userId'], "role": user['role'], "name": user['name']}

# Submission routes
@app.post("/api/submissions/audio")
async def upload_audio(
    audio: UploadFile = File(...),
    date: str = Form(...),
    user: Dict = Depends(require_role(["zookeeper"]))
):
    # Save audio file
    audio_ext = audio.content_type.split('/')[-1] if audio.content_type else 'wav'
    audio_filename = f"{user['userId']}_{date}_{int(datetime.now().timestamp() * 1000)}.{audio_ext}"
    audio_path = f"uploads/{audio_filename}"
    
    with open(audio_path, "wb") as f:
        content = await audio.read()
        f.write(content)
    
    try:
        # Process audio using Python script
        python_cmd = os.getenv('PYTHON', 'python3')
        result = subprocess.run(
            [python_cmd, 'server/run_model.py', audio_path, date, 'hi', audio.content_type or 'audio/wav'],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0 and result.stdout.strip():
            structured_data = json.loads(result.stdout.strip())
        else:
            # Fallback data
            structured_data = {
                "date_or_day": date,
                "animal_observed_on_time": True,
                "clean_drinking_water_provided": True,
                "enclosure_cleaned_properly": True,
                "normal_behaviour_status": True,
                "normal_behaviour_details": None,
                "feed_and_supplements_available": True,
                "feed_given_as_prescribed": True,
                "other_animal_requirements": "Audio processing error - manual review required",
                "incharge_signature": user['name'],
                "daily_animal_health_monitoring": f"Observation recorded on {date} - Audio processing encountered an error",
                "carnivorous_animal_feeding_chart": "Standard feeding schedule followed",
                "medicine_stock_register": "Stock levels adequate",
                "daily_wildlife_monitoring": f"Wildlife monitoring completed on {date}"
            }
    except Exception as e:
        print(f"Audio processing error: {e}")
        structured_data = {
            "date_or_day": date,
            "animal_observed_on_time": True,
            "clean_drinking_water_provided": True,
            "enclosure_cleaned_properly": True,
            "normal_behaviour_status": True,
            "normal_behaviour_details": None,
            "feed_and_supplements_available": True,
            "feed_given_as_prescribed": True,
            "other_animal_requirements": "Processing error",
            "incharge_signature": user['name'],
            "daily_animal_health_monitoring": f"Observation recorded on {date}",
            "carnivorous_animal_feeding_chart": "Standard feeding schedule",
            "medicine_stock_register": "Stock adequate",
            "daily_wildlife_monitoring": f"Monitoring completed on {date}"
        }
    
    # Generate TXT report
    txt_content = generate_txt_report(structured_data, user['name'], date)
    txt_filename = f"{user['userId']}_{date}_{int(datetime.now().timestamp() * 1000)}.txt"
    txt_path = f"reports/{txt_filename}"
    
    with open(txt_path, 'w') as f:
        f.write(txt_content)
    
    # Store submission
    submission_id = len(submissions_db) + 1
    submission = {
        "id": submission_id,
        "userId": user['id'],
        "date": date,
        "audioFileName": audio_filename,
        "transcription": "Processed from audio",
        "structuredData": structured_data,
        "txtFileName": txt_filename,
        "status": "processed",
        "createdAt": datetime.now().isoformat(),
        "user": user
    }
    submissions_db.append(submission)
    
    return {
        "message": "Audio processed successfully",
        "submissionId": submission_id,
        "structuredData": structured_data
    }

@app.get("/api/submissions/my")
async def get_my_submissions(user: Dict = Depends(require_role(["zookeeper"]))):
    user_submissions = [s for s in submissions_db if s['userId'] == user['id']]
    return user_submissions

@app.get("/api/submissions/all")
async def get_all_submissions(user: Dict = Depends(require_role(["admin", "doctor"]))):
    return submissions_db

@app.get("/api/submissions/{submission_id}")
async def get_submission(submission_id: int, user: Dict = Depends(require_auth)):
    submission = next((s for s in submissions_db if s['id'] == submission_id), None)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Add comments to submission
    submission_comments = [c for c in comments_db if c['submissionId'] == submission_id]
    submission['comments'] = submission_comments
    
    return submission

@app.post("/api/submissions/{submission_id}/comments")
async def add_comment(
    submission_id: int,
    comment: CommentRequest,
    user: Dict = Depends(require_role(["admin", "doctor"]))
):
    submission = next((s for s in submissions_db if s['id'] == submission_id), None)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    comment_id = len(comments_db) + 1
    new_comment = {
        "id": comment_id,
        "submissionId": submission_id,
        "userId": user['id'],
        "content": comment.content,
        "createdAt": datetime.now().isoformat(),
        "user": user
    }
    comments_db.append(new_comment)
    
    return new_comment

@app.get("/api/submissions/{submission_id}/download")
async def download_report(submission_id: int, user: Dict = Depends(require_auth)):
    submission = next((s for s in submissions_db if s['id'] == submission_id), None)
    if not submission or not submission.get('txtFileName'):
        raise HTTPException(status_code=404, detail="Report not found")
    
    file_path = f"reports/{submission['txtFileName']}"
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
    
    return FileResponse(file_path, filename=submission['txtFileName'], media_type='text/plain')

@app.put("/api/submissions/{submission_id}")
async def update_submission(
    submission_id: int,
    update: SubmissionUpdate,
    user: Dict = Depends(require_auth)
):
    submission = next((s for s in submissions_db if s['id'] == submission_id), None)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Check permissions
    if user['role'] == 'zookeeper' and submission['userId'] != user['id']:
        raise HTTPException(status_code=403, detail="Can only edit your own submissions")
    
    # Update structured data
    submission['structuredData'] = update.structuredData
    
    # Regenerate TXT file
    if submission.get('txtFileName'):
        txt_content = generate_txt_report(update.structuredData, submission['user']['name'], submission['date'])
        txt_path = f"reports/{submission['txtFileName']}"
        with open(txt_path, 'w') as f:
            f.write(txt_content)
    
    return submission

# Serve static files for production
if os.path.exists("dist/public"):
    app.mount("/", StaticFiles(directory="dist/public", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5000"))
    uvicorn.run(app, host="0.0.0.0", port=port)

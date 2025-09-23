import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Edit, X } from "lucide-react";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export default function SuccessModal({ isOpen, onClose, onEdit }: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="success-modal">
        <DialogHeader>
          <DialogTitle className="sr-only">Submission Successful</DialogTitle>
        </DialogHeader>
        
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-2xl text-primary" size={32} />
          </div>
          <h3 className="text-xl font-bold text-card-foreground mb-3">Thank You!</h3>
          <p className="text-muted-foreground mb-6">
            Your observation has been successfully submitted and processed.
          </p>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onEdit}
              className="flex-1"
              data-testid="button-edit-submission"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Submission
            </Button>
            <Button
              onClick={onClose}
              className="flex-1"
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PawPrint, Bus, UserRound, Users } from "lucide-react";

const loginSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Landing() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const login = useLogin();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      userId: "",
      password: "",
    },
  });

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
  };

  const handleBackToRoles = () => {
    setSelectedRole(null);
    form.reset();
  };

  const onSubmit = (data: LoginFormData) => {
    login.mutate(data);
  };

  const roleConfig = {
    admin: {
      icon: Bus,
      title: "Admin",
      description: "Manage system settings, view all reports, and oversee zoo operations",
      tags: ["System Management", "Reports", "User Management"],
    },
    doctor: {
      icon: UserRound,
      title: "Doctor",
      description: "Review animal health reports, add medical comments, and monitor wellness",
      tags: ["Health Monitoring", "Medical Review", "Comments"],
    },
    zookeeper: {
      icon: Users,
      title: "Zoo Keeper",
      description: "Submit daily observations, record animal behavior, and maintain logs",
      tags: ["Daily Reports", "Audio Recording", "Observations"],
    },
  };

  if (selectedRole) {
    const config = roleConfig[selectedRole as keyof typeof roleConfig];
    const Icon = config.icon;

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        <header className="bg-white shadow-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <PawPrint className="text-2xl text-primary" />
                <h1 className="text-xl font-bold text-foreground">Zoo Management System</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-md mx-auto">
            <Card className="shadow-lg border border-border">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="text-2xl text-primary" size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-card-foreground">{config.title} Login</h3>
                  <p className="text-muted-foreground mt-2">Enter your credentials to continue</p>
                </div>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <Label htmlFor="userId" className="block text-sm font-medium text-card-foreground mb-2">
                      User ID
                    </Label>
                    <Input
                      id="userId"
                      type="text"
                      placeholder="Enter your user ID"
                      data-testid="input-userId"
                      {...form.register("userId")}
                      className="focus:ring-2 focus:ring-ring focus:border-transparent"
                    />
                    {form.formState.errors.userId && (
                      <p className="text-destructive text-sm mt-1">{form.formState.errors.userId.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password" className="block text-sm font-medium text-card-foreground mb-2">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      data-testid="input-password"
                      {...form.register("password")}
                      className="focus:ring-2 focus:ring-ring focus:border-transparent"
                    />
                    {form.formState.errors.password && (
                      <p className="text-destructive text-sm mt-1">{form.formState.errors.password.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={login.isPending}
                    data-testid="button-login"
                  >
                    {login.isPending ? "Logging in..." : "Login"}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Button
                    variant="ghost"
                    onClick={handleBackToRoles}
                    className="text-primary hover:text-primary/80"
                    data-testid="button-back"
                  >
                    ← Back to role selection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <header className="bg-white shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <PawPrint className="text-2xl text-primary" />
              <h1 className="text-xl font-bold text-foreground">Zoo Management System</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Welcome to Zoo Management System</h2>
            <p className="text-lg text-muted-foreground">Please select your role to continue</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {Object.entries(roleConfig).map(([role, config]) => {
              const Icon = config.icon;
              return (
                <Card
                  key={role}
                  className="shadow-lg border border-border hover:shadow-xl transition-all duration-300 cursor-pointer group"
                  onClick={() => handleRoleSelect(role)}
                  data-testid={`card-role-${role}`}
                >
                  <CardContent className="p-8 text-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/20 transition-colors">
                      <Icon className="text-3xl text-primary" size={48} />
                    </div>
                    <h3 className="text-xl font-semibold text-card-foreground mb-3">{config.title}</h3>
                    <p className="text-muted-foreground mb-6">{config.description}</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {config.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

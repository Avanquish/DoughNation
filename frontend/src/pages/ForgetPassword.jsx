import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Swal from "sweetalert2";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // step 1 = email, 2 = date, 3 = reset
  const [email, setEmail] = useState("");
  const [registrationDate, setRegistrationDate] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 1: validate email
  const handleValidateEmail = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:8000/forgot-password/check-email", {
        email,
      });
      if (res.data.valid) {
        Swal.fire({
          icon: "success",
          title: "Email Found",
          text: "Please confirm your registration date.",
          confirmButtonColor: "#16a34a",
        });
        setStep(2);
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Email Not Found",
        text: err.response?.data?.detail || "This email is not registered.",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  // Step 2: validate registration date
  const handleValidateDate = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:8000/forgot-password/check-date", {
        email,
        registration_date: registrationDate,
      });
      if (res.data.valid) {
        Swal.fire({
          icon: "success",
          title: "Authentication Passed",
          text: "You can now reset your password.",
          confirmButtonColor: "#16a34a",
        });
        setStep(3);
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Invalid Date",
        text: err.response?.data?.detail || "The date you entered is incorrect.",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  // Step 3: reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:8000/forgot-password/reset", {
        email,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      Swal.fire({
        icon: "success",
        title: "Password Reset Successful",
        text: res.data.message || "You can now log in with your new password.",
        confirmButtonColor: "#16a34a",
      }).then(() => {
        navigate("/login");
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Password Reset Failed",
        text: err.response?.data?.detail || "Something went wrong.",
        confirmButtonColor: "#dc2626",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-elegant">
          <CardHeader className="text-center">
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              {step === 1 && "Enter your registered email."}
              {step === 2 && "Confirm your registration date."}
              {step === 3 && "Set a new password."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 && (
              <form onSubmit={handleValidateEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Registered Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Next
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleValidateDate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="registrationDate">Date of Registration</Label>
                  <Input
                    id="registrationDate"
                    type="date"
                    value={registrationDate}
                    onChange={(e) => setRegistrationDate(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Next
                </Button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Reset Password
                </Button>
              </form>
            )}

            <div className="text-center text-sm mt-4">
              <Link to="/login" className="text-primary hover:underline">
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Heart, Store, Building2 } from "lucide-react";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Bakery");

  const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const res = await axios.post("http://localhost:8000/login", {
      email,
      password,
      role, // Send selected role in request
    });

    const token = res.data.access_token;
    login(token);

    const decoded = JSON.parse(atob(token.split(".")[1]));
    const { sub, role: actualRole } = decoded;

    if (actualRole !== role) {
      alert(`You are not authorized to log in as ${role}.`);
      return;
    }

    if (actualRole === "Bakery") {
      navigate(`/bakery-dashboard/${sub}`);
    } else if (actualRole === "Charity") {
      navigate(`/charity-dashboard/${sub}`);
    } else if (actualRole === "Admin") {
      navigate(`/admin-dashboard/${sub}`);
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Login failed. Please check your credentials.");
  }
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-surface to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">DoughNation</span>
          </div>
          <p className="text-muted-foreground">Connect. Share. Care.</p>
        </div>

        <Card className="shadow-elegant">
          <CardHeader className="text-center">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Tabs value={role} onValueChange={setRole} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="Bakery" className="flex items-center gap-1 justify-center">
                    <Store className="h-4 w-4" />
                    Bakery
                  </TabsTrigger>
                  <TabsTrigger value="Charity" className="flex items-center gap-1 justify-center">
                    <Heart className="h-4 w-4" />
                    Charity
                  </TabsTrigger>
                  <TabsTrigger value="Admin" className="flex items-center gap-1 justify-center">
                    <Building2 className="h-4 w-4" />
                    Admin
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Sign In as {role}
              </Button>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Don't have an account? </span>
                <Link to="/register" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>

              <div className="text-center text-sm">
                <Link to="/" className="text-muted-foreground hover:underline">
                  Back to Home
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;

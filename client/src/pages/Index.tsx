import { UserCircle, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Header title="Library Management System" />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <img 
              src="/logo.png" 
              alt="Kids Paradise School Logo" 
              className="h-24 w-24 mx-auto object-contain animate-pulse-scale"
            />
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Welcome to Our Library! 📚
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover amazing books, learn new things, and track your reading journey!
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <Card className="p-8 hover:shadow-xl transition-shadow bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
              <div className="space-y-4">
                <UserCircle className="h-16 w-16 mx-auto text-primary" />
                <h3 className="text-2xl font-bold">Admin Login</h3>
                <p className="text-muted-foreground">
                  Manage books, students, and library operations
                </p>
                <Button 
                  size="lg" 
                  className="w-full text-lg py-6 gap-2"
                  onClick={() => navigate("/admin/login")}
                >
                  <UserCircle className="h-5 w-5" />
                  Admin Portal
                </Button>
              </div>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-shadow bg-gradient-to-br from-accent/10 to-accent/5 border-2 border-accent/20">
              <div className="space-y-4">
                <GraduationCap className="h-16 w-16 mx-auto text-accent" />
                <h3 className="text-2xl font-bold">Student Login</h3>
                <p className="text-muted-foreground">
                  Browse books, check your history, and explore ebooks
                </p>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="w-full text-lg py-6 gap-2 border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                  onClick={() => navigate("/student/login")}
                >
                  <GraduationCap className="h-5 w-5" />
                  Student Portal
                </Button>
              </div>
            </Card>
          </div>

          <div className="mt-12 p-6 bg-secondary/20 rounded-2xl border-2 border-secondary">
            <p className="text-lg font-semibold text-secondary-foreground">
              ✨ Fun fact: Reading helps you learn new words and imagine amazing adventures! ✨
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Coins, Mail, Lock } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // MVP: Solo redirige sin validación
    navigate("/home");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(259,59%,46%)] via-[hsl(263,68%,33%)] to-[hsl(291,64%,62%)] p-4">
      <Card className="w-full max-w-md p-8 bg-white/95 backdrop-blur shadow-2xl border-0">
        {/* Logo y Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(259,59%,46%)] to-[hsl(291,64%,62%)] mb-4">
            <Coins className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[hsl(263,68%,20%)] mb-2">
            Blocky
          </h1>
          <p className="text-[hsl(263,68%,33%)] text-sm">
            {isLogin ? "Bienvenido de nuevo" : "Crea tu cuenta"}
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[hsl(263,68%,20%)]">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(263,68%,33%)]" />
              <Input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-white border-[hsl(291,64%,62%)]/30 focus:border-[hsl(259,59%,46%)] text-[hsl(263,68%,20%)] placeholder:text-[hsl(263,68%,33%)]"
                required
              />
            </div>
          </div>

          {/* Contraseña */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[hsl(263,68%,20%)]">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(263,68%,33%)]" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-white border-[hsl(291,64%,62%)]/30 focus:border-[hsl(259,59%,46%)] text-[hsl(263,68%,20%)] placeholder:text-[hsl(263,68%,33%)]"
                required
              />
            </div>
          </div>

          {/* Forgot Password (solo en login) */}
          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-[hsl(259,59%,46%)] hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          {/* Botón Principal */}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-[hsl(259,59%,46%)] to-[hsl(291,64%,62%)] hover:from-[hsl(263,68%,33%)] hover:to-[hsl(259,59%,46%)] text-white font-semibold py-6 text-base"
          >
            {isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[hsl(291,64%,62%)]/20"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-[hsl(263,68%,33%)]">o</span>
          </div>
        </div>

        {/* Toggle Login/Registro */}
        <div className="text-center">
          <p className="text-sm text-[hsl(263,68%,33%)]">
            {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-[hsl(259,59%,46%)] font-semibold hover:underline"
            >
              {isLogin ? "Regístrate" : "Inicia Sesión"}
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[hsl(263,68%,33%)]">
            Al continuar, aceptas nuestros términos y condiciones
          </p>
        </div>
      </Card>
    </div>
  );
}

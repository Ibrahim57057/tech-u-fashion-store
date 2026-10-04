import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";
import { canAccessAdmin } from "./permissions.js";

export default function AdminRoute({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const allowed = canAccessAdmin(user);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
    } else if (!allowed) {
      navigate("/");
    }
  }, [isLoading, isAuthenticated, allowed, navigate]);

  if (isLoading || !isAuthenticated || !allowed) return null;

  return children;
}

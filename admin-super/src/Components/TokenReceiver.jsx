import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function TokenReceiver() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("adminToken", token);

      // remove token from URL (clean)
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  return null;
}
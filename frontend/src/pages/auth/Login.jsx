import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Fish, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/api';
import toast from 'react-hot-toast';

export function Login() {
  const navigate = useNavigate();
  const { token, login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Error states
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Input refs for auto focus
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset errors
    setEmailError('');
    setPasswordError('');

    let hasValidationError = false;

    if (!email) {
      setEmailError("Email address is required");
      hasValidationError = true;
    }
    if (!password) {
      setPasswordError("Password is required");
      hasValidationError = true;
    }

    if (hasValidationError) {
      toast.error("Please fill in all fields");
      setTimeout(() => {
        if (!email) emailRef.current?.focus();
        else if (!password) passwordRef.current?.focus();
      }, 50);
      return;
    }

    setSubmitting(true);
    try {
      const data = await authService.login({ email, password });
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.username}!`);
      navigate('/dashboard');
    } catch (err) {
      const status = err.response?.status;
      let errMsg = "Something went wrong. Please try again.";

      if (status === 401) {
        errMsg = "Invalid email or password";
        setEmailError("Invalid email or password");
        setPasswordError("Invalid email or password");
        setTimeout(() => {
          emailRef.current?.focus();
        }, 50);
      } else if (status === 404) {
        errMsg = "Account not found";
        setEmailError("Account not found");
        setTimeout(() => {
          emailRef.current?.focus();
        }, 50);
      } else if (status >= 500) {
        errMsg = "Server error. Please try again later.";
      } else {
        errMsg = err.response?.data?.error || "Invalid email or password";
      }

      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Fish className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
        </div>
        <Card>
          <CardContent className="mt-4">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <Input
                ref={emailRef}
                label="Email address"
                id="email-address"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError('');
                }}
                error={emailError}
                placeholder="admin@aquafeed.com"
                disabled={submitting}
              />
              <Input
                ref={passwordRef}
                label="Password"
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                error={passwordError}
                placeholder="••••••••"
                disabled={submitting}
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                    disabled={submitting}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
              <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

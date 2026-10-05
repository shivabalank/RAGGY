import { Link } from 'react-router-dom';
import { AuthCard } from '../components/auth/AuthCard';
import { LoginForm } from '../components/auth/LoginForm';

export default function Login() {
  return (
    <AuthCard title="Welcome back" subtitle="Sign in to chat with your documents."
      footer={<>New to Raggy? <Link to="/signup" className="font-semibold text-brand-600 hover:text-brand-800 hover:underline">Create an account</Link></>}>
      <LoginForm />
    </AuthCard>
  );
}

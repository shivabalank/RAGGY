import { Link } from 'react-router-dom';
import { AuthCard } from '../components/auth/AuthCard';
import { SignupForm } from '../components/auth/SignupForm';

export default function Signup() {
  return (
    <AuthCard title="Create your account" subtitle="Upload a document and start asking questions."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-800 hover:underline">Sign in</Link></>}>
      <SignupForm />
    </AuthCard>
  );
}

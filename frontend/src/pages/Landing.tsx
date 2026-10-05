import { Link } from 'react-router-dom';
import { FileSearch, MessageSquareText, Quote } from 'lucide-react';
import { HERO_URL } from '../config';
import { useAuth } from '../hooks/useAuth';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/Button';

const features = [
  { icon: FileSearch, title: 'Upload any PDF or DOCX', text: 'Drop in reports, papers or contracts. Your documents are indexed so every question searches the full text.' },
  { icon: MessageSquareText, title: 'Ask in plain language', text: 'Get direct answers, summaries and extracted details without scrolling through pages.' },
  { icon: Quote, title: 'See where answers come from', text: 'Each answer lists the pages it was drawn from, so you can verify before you rely on it.' },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-[100dvh] bg-white">
      <section className="bg-brand-50 bg-cover bg-center" style={{ backgroundImage: `url(${HERO_URL})` }}>
        <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-5 py-5">
          <nav className="mx-auto flex w-full max-w-4xl items-center justify-between rounded-full border border-white/80 bg-white/90 py-2 pl-4 pr-2 shadow-soft ring-1 ring-brand-100 backdrop-blur"><Logo size={34} />
            <div className="flex items-center gap-2">
              {user ? <Link to="/dashboard"><Button>Open dashboard</Button></Link> : <><Link to="/login"><Button variant="ghost">Sign in</Button></Link><Link to="/signup" className="hidden sm:block"><Button>Get started</Button></Link></>}
            </div>
          </nav>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xl animate-slide-up rounded-2xl border border-white/70 bg-white px-6 py-10 text-center shadow-card sm:px-10 sm:py-12">
              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-zinc-900 sm:text-5xl">Answers from your documents, with the pages to prove it.</h1>
              <p className="mx-auto mt-4 max-w-md text-lg text-zinc-500">Upload a PDF or Word file, ask a question, and get a cited answer in seconds.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to={user ? '/dashboard' : '/signup'}><Button size="lg" className="w-full sm:w-auto">Upload your first document</Button></Link>
                {!user && <Link to="/login"><Button size="lg" variant="secondary" className="w-full sm:w-auto">Sign in</Button></Link>}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-16 md:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border border-zinc-200 p-6">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span>
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-1.5 text-zinc-500">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

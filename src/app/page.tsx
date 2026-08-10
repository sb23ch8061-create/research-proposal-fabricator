import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900">
      <div className="max-w-3xl w-full text-center space-y-8 p-12 bg-gray-100/50 backdrop-blur-md rounded-2xl shadow-lg border border-gray-300">
        <h1 className="text-5xl font-extrabold tracking-tight">
          Research Proposal Fabricator
        </h1>
        <p className="text-xl leading-relaxed font-medium">
          An aesthetic, professional environment to construct verified, professor-specific applications.
        </p>
        <Link 
          href="/dashboard"
          className="inline-block mt-4 px-8 py-4 rounded-lg font-semibold shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 bg-gray-800 text-gray-100"
        >
          Enter Workspace
        </Link>
      </div>
    </main>
  );
}
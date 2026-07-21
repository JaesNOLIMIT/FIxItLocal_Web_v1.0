import { Link } from 'react-router-dom';

function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-soft">
        <h1 className="text-2xl font-bold text-primary">Unauthorized</h1>
        <p className="mt-2 text-sm text-on-primary-container">
          This account does not have access to a supported portal role.
        </p>
        <Link
          to="/login"
          className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-container"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default UnauthorizedPage;

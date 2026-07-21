import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, LogOut, Search, Settings, UserCircle2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS, getRoleKeyFromDatabaseRole } from '../config/roleConfig';
import { fetchUserDetailsByUserId, getValidAccessToken } from '../lib/supabaseRest';

function Header({ onSignOut }) {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { profile } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [matchedDetails, setMatchedDetails] = useState(null);
  const profileMenuRef = useRef(null);

  const getSettingsPath = () => {
    const section = routeLocation.pathname.split('/').filter(Boolean)[0];
    return section ? `/${section}/settings` : '/settings';
  };

  const firstName = (matchedDetails?.first_name || profile?.user_details?.first_name || '').trim();
  const lastName = (matchedDetails?.last_name || profile?.user_details?.last_name || '').trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const roleLabel = ROLE_LABELS[getRoleKeyFromDatabaseRole(profile?.role)] || profile?.role || 'User';
  const fallbackAvatar =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBAKmnNjCZmHubMTsfsRxsRbeytgN8Hch8w6qu9gI1IHYo9LEb4j-1TkFIfWFHoBYkQyIGPGVH8QKCOj3NLcuiBGS3BwmLQl_7Xzl6tB2vVbUjyhZHAA1GIX_d7jMCe-MjYAoCmd4dztxky6KnOtfOMhdLjvkDDAc4NXfH0gpp3Ek6uKqE8TjyiN9kQxJqrYeI9I54JEHqN_gFx1qKkSHtH2Ue90OskdyDk1ZXcSilgkXzqynKMII1kDMMlV49fYg1w-u8RJVjltijg';
  const avatarSrc = matchedDetails?.photo_path || profile?.user_details?.photo_path || fallbackAvatar;

  useEffect(() => {
    let cancelled = false;

    const loadMatchedDetails = async () => {
      if (!profile?.user_id) {
        setMatchedDetails(null);
        return;
      }

      try {
        const token = await getValidAccessToken();
        if (!token) {
          return;
        }
        const details = await fetchUserDetailsByUserId(profile.user_id, token);
        if (!cancelled) {
          setMatchedDetails(details);
        }
      } catch {
        if (!cancelled) {
          setMatchedDetails(null);
        }
      }
    };

    loadMatchedDetails();

    return () => {
      cancelled = true;
    };
  }, [profile?.user_id]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setIsSignOutModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, []);

  const handleSignOut = async () => {
    setIsSignOutModalOpen(false);
    if (typeof onSignOut === 'function') {
      await onSignOut();
    }
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/50 bg-white/80 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 lg:hidden">
            <BrandLogo compact muted />
          </div>

          <div className="relative order-3 w-full flex-1 max-w-2xl lg:order-none lg:w-auto">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-primary-container" />
            <input
              type="search"
              placeholder="Search reports, locations, or IDs..."
              className="h-11 w-full rounded-full border-none bg-surface-container-low px-12 pr-4 text-sm text-on-background outline-none ring-0 placeholder:text-on-primary-container focus:ring-2 focus:ring-secondary/20"
            />
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Notifications"
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <Bell size={18} />
              </button>
              <button
                type="button"
                aria-label="Settings"
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <Settings size={18} />
              </button>
            </div>

            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                aria-label="Open profile menu"
                aria-expanded={isProfileOpen}
                onClick={() => setIsProfileOpen((current) => !current)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 shadow-sm transition hover:border-slate-300 hover:shadow"
              >
                <img
                  alt="Administrative user avatar"
                  src={avatarSrc}
                  className="h-10 w-10 rounded-full object-cover"
                />
                <ChevronDown
                  size={15}
                  className={`text-slate-500 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 top-14 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-primary">
                        {profile?.user_details?.photo_path ? (
                          <img src={avatarSrc} alt="Profile avatar" className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          <UserCircle2 size={26} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-primary">{fullName}</p>
                        <p className="truncate text-xs text-on-primary-container">{profile?.email || 'No email'}</p>
                        <p className="truncate text-xs text-on-primary-container">{roleLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate(getSettingsPath());
                      }}
                      className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <Settings size={16} />
                      Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsSignOutModalOpen(true);
                      }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-800"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {isSignOutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <LogOut size={19} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">Sign Out</h3>
                <p className="text-sm text-on-primary-container">Are you sure you want to sign out?</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsSignOutModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-on-surface transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;

"use client";

import { Fragment, useState, useEffect } from "react"; // 👈 add useEffect
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Transition, Dialog } from "@headlessui/react";
import {
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "./AuthProvider";
import Image from "next/image";
import logo from "../assets/logo/ceflixplus-logo.png";

function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

export default function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout, initialized } = useAuth();

  if (pathname.startsWith("/login") || pathname.startsWith("/player")) return null;

  const loggedIn = Boolean(token && user);
  const displayName =
    user?.fname && user?.lname
      ? `${user.fname} ${user.lname}`
      : user?.username || "Profile";

  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // 👇 track scroll to switch between faded + solid
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll(); // initial
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cx(
        "fixed w-full top-0 z-40 transition-colors duration-400",
        scrolled ? "bg-neutral-950/40 backdrop-blur" : ""
      )}
    >
      <div className="mx-auto px-4 sm:px-[5rem]">
        <div className="h-16 flex items-center justify-between">
          {/* LEFT: Brand + desktop nav */}
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden inline-flex items-center justify-center rounded-md p-2 text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
              aria-label="Open navigation"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Brand (you can replace with a logo image) */}
            <Link href="/" className="flex items-center gap-2">
              <Image
                src={logo}
                alt="Kingschat logo"
                className="w-[5.4rem] mx-auto"
              />
            </Link>

            {/* Desktop nav links */}
            <nav className="hidden lg:flex items-center gap-2 ml-4 text-sm">
              <NavLink href="/" active={pathname === "/"}>
                Home
              </NavLink>
              <NavLink href="/shows" active={pathname.startsWith("/shows")}>
                Shows
              </NavLink>
              <NavLink href="/movies" active={pathname.startsWith("/movies")}>
                Movies
              </NavLink>
              <NavLink href="/my-list" active={pathname.startsWith("/my-list")}>
                My List
              </NavLink>
            </nav>
          </div>

          {/* RIGHT: search + auth/profile */}
          <div className="flex items-center gap-3">
            {/* Search icon (hook up to your search page later) */}
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="inline-flex items-center justify-center rounded-full p-2 text-white/90 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>

            {/* Auth section */}
            {initialized && loggedIn ? (
              <>
                {/* Desktop profile dropdown */}
                <Menu as="div" className="relative hidden lg:block">
                  <Menu.Button className="inline-flex h-9 items-center gap-2 rounded-full bg-white/10 px-2 pr-3 text-sm text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20">
                    <ProfileAvatar src={user?.profile_pic} />
                    <span className="max-w-[120px] truncate">
                      {displayName}
                    </span>
                    <ChevronDownIcon className="h-4 w-4" />
                  </Menu.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-150"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl bg-neutral-900/95 border border-white/10 shadow-2xl focus:outline-none py-1">
                      <div className="px-3 py-2 border-b border-white/10">
                        <p className="text-sm font-semibold text-white truncate">
                          {displayName}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">
                          {user?.email}
                        </p>
                      </div>

                      <MenuItemLink href="/profile">Profile</MenuItemLink>
                      <MenuItemLink href="/my-list">My List</MenuItemLink>

                      <div className="border-t border-white/10 mt-1 pt-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              type="button"
                              onClick={() => logout()}
                              className={cx(
                                "flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400",
                                active && "bg-white/5"
                              )}
                            >
                              <ArrowRightOnRectangleIcon className="h-4 w-4" />
                              <span>Sign out</span>
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Transition>
                </Menu>

                {/* Mobile profile button */}
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/20 overflow-hidden"
                  aria-label="Open profile"
                >
                  <ProfileAvatar src={user?.profile_pic} />
                </button>
              </>
            ) : (
              initialized && (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login?mode=signup"
                    className="hidden md:inline-flex items-center rounded-full bg-white text-neutral-900 font-semibold text-sm px-4 py-1.5 hover:brightness-95"
                  >
                    Sign Up
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center rounded-full border border-white/40 text-white font-semibold text-sm px-4 py-1.5 hover:bg-white/10"
                  >
                    Sign In
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Simple top search bar row (optional) */}
      {searchOpen && (
        <div className="border-t border-white/10 bg-neutral-900/80">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 py-3">
            <input
              autoFocus
              type="text"
              placeholder="Search Ceflix"
              className="w-full rounded-md bg-neutral-800/80 border border-neutral-700/80 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const q = (e.currentTarget as HTMLInputElement).value.trim();
                  if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
                  setSearchOpen(false);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* MOBILE NAV SHEET (hamburger + profile combined) */}
      <Transition show={mobileOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 lg:hidden"
          onClose={setMobileOpen}
        >
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-out duration-150"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60" />
          </Transition.Child>

          <div className="fixed inset-0">
            <Transition.Child
              as={Fragment}
              enter="transition transform duration-200"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition transform duration-200"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="fixed left-0 top-0 h-full w-full max-w-[360px] bg-neutral-900 text-white border-r border-white/10 shadow-2xl overflow-y-auto">
                {/* header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                  <span className="text-lg font-bold">
                    Ceflix<span className="text-red-500">+</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md p-2 hover:bg-white/10"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* body */}
                <nav className="px-2 py-3 space-y-1 text-[15px]">
                  <MobileRow href="/" onClick={() => setMobileOpen(false)}>
                    Home
                  </MobileRow>
                  <MobileRow href="/shows" onClick={() => setMobileOpen(false)}>
                    Shows
                  </MobileRow>
                  <MobileRow
                    href="/movies"
                    onClick={() => setMobileOpen(false)}
                  >
                    Movies
                  </MobileRow>
                  <MobileRow
                    href="/my-list"
                    onClick={() => setMobileOpen(false)}
                  >
                    My List
                  </MobileRow>

                  <hr className="border-white/10 my-2" />

                  {initialized && loggedIn ? (
                    <>
                      <div className="flex items-center px-3 py-2 gap-2">
                        <ProfileAvatar src={user?.profile_pic} size="lg" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-neutral-400 truncate">
                            {user?.email}
                          </p>
                        </div>
                      </div>

                      <MobileRow
                        href="/profile"
                        onClick={() => setMobileOpen(false)}
                      >
                        Profile
                      </MobileRow>
                      <MobileRow
                        href="/my-list"
                        onClick={() => setMobileOpen(false)}
                      >
                        My List
                      </MobileRow>

                      <button
                        type="button"
                        onClick={() => {
                          setMobileOpen(false);
                          logout();
                        }}
                        className="mt-2 flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-white/10"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                        <span>Sign out</span>
                      </button>
                    </>
                  ) : (
                    initialized && (
                      <div className="space-y-1 mt-2">
                        <MobileRow
                          href="/login"
                          onClick={() => setMobileOpen(false)}
                        >
                          Sign In
                        </MobileRow>
                        <MobileRow
                          href="/login?mode=signup"
                          onClick={() => setMobileOpen(false)}
                        >
                          Create Account
                        </MobileRow>
                      </div>
                    )
                  )}
                </nav>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </header>
  );
}

/* ---------- Small helper subcomponents ---------- */

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "px-3 py-1.5 rounded-full transition text-sm",
        active
          ? "font-[900] text-white"
          : "text-neutral-200 hover:bg-white/10"
      )}
    >
      {children}
    </Link>
  );
}

function MenuItemLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Menu.Item>
      {({ active }) => (
        <Link
          href={href}
          className={cx(
            "flex w-full items-center px-3 py-2 text-sm text-white/90",
            active && "bg-white/10"
          )}
        >
          {children}
        </Link>
      )}
    </Menu.Item>
  );
}

function MobileRow({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block w-full px-3 py-2 rounded-md text-left hover:bg-white/10"
    >
      {children}
    </Link>
  );
}

function ProfileAvatar({
  src,
  size = "md",
}: {
  src?: string | null;
  size?: "md" | "lg";
}) {
  const className =
    size === "lg"
      ? "h-10 w-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden"
      : "h-7 w-7 rounded-full bg-white/10 flex items-center justify-center overflow-hidden";

  if (src) {
    return (
      <div className={className}>
        {/* if your API already gives a full URL, leave it as is */}
        <img src={src} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className={className}>
      <UserCircleIcon className="h-full w-full text-white/70" />
    </div>
  );
}

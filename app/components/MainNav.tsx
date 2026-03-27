"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Transition } from "@headlessui/react";
import {
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  RadioIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "./AuthProvider";
import Image from "next/image";
import logo from "../assets/logo/ceflixplus-logo.png";
import { mainNavItems } from "./navconfig";

function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

type MainNavProps = {
  onToggleSideNav?: () => void;
  sideCollapsed?: boolean;
};

export default function MainNav({
  onToggleSideNav,
  sideCollapsed,
}: MainNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout, initialized } = useAuth();

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/password/reset") ||
    pathname.startsWith("/register")
  )
    return null;

  const loggedIn = Boolean(token && user);
  const displayName =
    user?.fname && user?.lname
      ? `${user.fname} ${user.lname}`
      : user?.username || "Profile";

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = () => {
    const q = searchTerm.trim();
    if (!q) return;

    const encoded = encodeURIComponent(q).replace(/%20/g, "+");
    router.push(`/search?q=${encoded}`);
  };

  const handleToggleSide = () => {
    if (onToggleSideNav) onToggleSideNav();
  };

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cx(
        "fixed w-full top-0 z-40 transition-colors duration-400",
        "bg-neutral-950/40 backdrop-blur",
      )}
    >
      <div className="px-4 sm:px-6 lg:px-auto lg:pl-[0.8rem] lg:pr-8">
        <div className="h-16 flex items-center gap-4">
          {/* LEFT: menu + brand */}
          <div className="flex items-center gap-3 shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="cursor-pointer lg:hidden inline-flex items-center justify-center rounded-md p-2 text-white/90 hover:bg-white/10"
              aria-label="Open navigation"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <button
              type="button"
              onClick={handleToggleSide}
              className="cursor-pointer hidden lg:inline-flex items-center justify-center rounded-md p-2 mr-1 text-white/90 hover:bg-white/10"
              aria-label="Toggle sidebar"
            >
              <Bars3Icon className="h-6 w-6 transition-transform" />
            </button>

            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image
                src={logo}
                alt="Ceflix+"
                className="w-[5.4rem] h-auto"
                priority
              />
            </Link>
          </div>

          {/* CENTER: search */}
          <div className="flex-1 flex justify-end lg:justify-center">
            <div className="hidden sm:flex items-center gap-2 w-full max-w-3xl pl-4 pr-2 py-2 rounded-full bg-neutral-900 border border-neutral-800">
              <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search Ceflix"
                className="flex-1 bg-transparent text-sm text-white placeholder-neutral-400 focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleSearch}
                className="cursor-pointer inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold text-white hover:bg-white/20"
              >
                Search
              </button>
            </div>

            <button
              type="button"
              className="sm:hidden inline-flex items-center justify-center rounded-full p-2 bg-white/10 text-white hover:bg-white/15"
              aria-label="Search"
              onClick={() => router.push("/search")}
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          </div>

          {/* RIGHT: auth/profile */}
          <div className="flex items-center gap-3 shrink-0">
            {initialized && loggedIn && (
              <Menu as="div" className="relative">
                <Menu.Button
                  className="cursor-pointer inline-flex px-4 py-2 items-center justify-center gap-2 rounded-full bg-white/10 text-white hover:bg-white/15"
                  aria-label="Create"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span className="text-sm font-semibold hidden md:block">
                    Create
                  </span>
                </Menu.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-150"
                  enterFrom="opacity-0 scale-95 translate-y-1"
                  enterTo="opacity-100 scale-100 translate-y-0"
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100 scale-100 translate-y-0"
                  leaveTo="opacity-0 scale-95 translate-y-1"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-52 origin-top-right rounded-xl bg-neutral-900/95 border border-white/10 shadow-2xl focus:outline-none py-1">
                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          href="/upload"
                          className={cx(
                            "flex items-center gap-3 px-3 py-2 text-sm text-white/90",
                            active && "bg-white/10",
                          )}
                        >
                          <ArrowUpTrayIcon className="h-5 w-5" />
                          <span>Upload video</span>
                        </Link>
                      )}
                    </Menu.Item>

                    <Menu.Item>
                      {({ active }) => (
                        <Link
                          href="/streaming"
                          className={cx(
                            "flex items-center gap-3 px-3 py-2 text-sm text-white/90",
                            active && "bg-white/10",
                          )}
                        >
                          <RadioIcon className="h-5 w-5" />
                          <span>Go live</span>
                        </Link>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            )}

            {initialized && loggedIn ? (
              <>
                <Menu as="div" className="relative hidden lg:block">
                  <Menu.Button className="cursor-pointer inline-flex items-center gap-2 rounded-full text-sm text-white hover:bg-white/15">
                    <ProfileAvatar src={user?.profile_pic} />
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

                      <MenuItemLink href="/studio">Ceflix Studio</MenuItemLink>
                      <MenuItemLink href="/settings">Settings</MenuItemLink>

                      <div className="border-t border-white/10 mt-1 pt-1">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              type="button"
                              onClick={() => logout()}
                              className={cx(
                                "cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400",
                                active && "bg-white/5",
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

                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15 overflow-hidden"
                  aria-label="Open profile"
                >
                  <ProfileAvatar src={user?.profile_pic} />
                </button>
              </>
            ) : (
              initialized && (
                <div className="flex items-center gap-2">
                  <Link
                    href="/register"
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

      <Transition show={mobileOpen} as={Fragment}>
        <div className="relative z-50 lg:hidden">
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-out duration-150"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 bg-black/60"
              onClick={() => setMobileOpen(false)}
            />
          </Transition.Child>

          <div className="fixed inset-0 pointer-events-none">
            <Transition.Child
              as={Fragment}
              enter="transition transform duration-200"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition transform duration-200"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <div className="pointer-events-auto fixed left-0 top-0 h-full w-full max-w-[360px] bg-neutral-900 text-white border-r border-white/10 shadow-2xl overflow-y-auto">
                {/* header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
                  <Link
                    href="/"
                    className="flex items-center gap-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Image
                      src={logo}
                      alt="Ceflix+"
                      className="w-[5.4rem] h-auto"
                      priority
                    />
                  </Link>
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
                  {mainNavItems.map((item) => (
                    <MobileRow
                      key={item.href}
                      item={item}
                      onClick={() => setMobileOpen(false)}
                    />
                  ))}

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
                        href="/studio"
                        onClick={() => setMobileOpen(false)}
                      >
                        Ceflix Studio
                      </MobileRow>
                      <MobileRow
                        href="/settings"
                        onClick={() => setMobileOpen(false)}
                      >
                        Settings
                      </MobileRow>

                      <button
                        type="button"
                        onClick={() => {
                          setMobileOpen(false);
                          logout();
                        }}
                        className="cursor-pointer mt-2 flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-white/10"
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
              </div>
            </Transition.Child>
          </div>
        </div>
      </Transition>
    </header>
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
            active && "bg-white/10",
          )}
        >
          {children}
        </Link>
      )}
    </Menu.Item>
  );
}

function MobileRow({
  item,
  href,
  onClick,
  children,
  icon: CustomIcon,
}: {
  item?: {
    href: string;
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    activeIcon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  };
  href?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  const pathname = usePathname();

  const linkHref = item?.href ?? href ?? "#";
  const label = item?.label ?? children;

  const active =
    linkHref === "/"
      ? pathname === "/"
      : pathname === linkHref || pathname.startsWith(`${linkHref}/`);

  const Icon = item
    ? active
      ? item.activeIcon || item.icon
      : item.icon
    : CustomIcon || null;

  return (
    <Link
      href={linkHref}
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-3 px-3 py-2 rounded-md text-left transition",
        active
          ? "bg-white/10 text-white font-semibold"
          : "text-white/85 hover:bg-white/10",
      )}
    >
      {Icon ? <Icon className="h-5 w-5 shrink-0" /> : null}
      <span>{label}</span>
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
      : "h-8 w-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden";

  if (src) {
    return (
      <div className={className}>
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

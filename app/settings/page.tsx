"use client";

import "cropperjs/dist/cropper.css";

import React, {
  useEffect,
  useState,
  useRef,
  FormEvent,
  ChangeEvent,
} from "react";
import Image from "next/image";
import Cropper, { ReactCropperElement } from "react-cropper";
import {
  CameraIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../components/AuthProvider";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";
const STORAGE_KEY = "ceflix_auth";

export default function SettingsPage() {
  const { user, token } = useAuth();

  // personal info
  const [fName, setFName] = useState("");
  const [lName, setLName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [about, setAbout] = useState("");

  // password
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // profile picture
  const [thumbnail, setThumbnail] = useState("");
  const [thumbFileName, setThumbFileName] = useState("");
  const [thumbDirty, setThumbDirty] = useState(false);

  // inline cropper
  const [rawThumbImage, setRawThumbImage] = useState("");
  const [showCropper, setShowCropper] = useState(false);
  const cropperRef = useRef<ReactCropperElement | null>(null);

  // status + errors
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);

  const [passwordErrorMsg, setPasswordErrorMsg] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [passwordShowBanner, setPasswordShowBanner] = useState(false);

  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState(false);

  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [infoError, setInfoError] = useState(false);

  // hydrate from user
  useEffect(() => {
    if (!user) return;
    console.log(user);
    setFName(user.fname || "");
    setLName(user.lname || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setAbout(user.bio || "");
    setThumbnail(user.profile_pic || "https://ceflix.org/images/fallback.png");
  }, [user]);

  // -----------------------------------
  // Handlers – thumbnail + cropper
  // -----------------------------------
  const handleThumbFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 2MB
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setProfileError(true);
      setProfileMsg("Image is too large. Maximum allowed size is 2MB.");
      setThumbFileName("");
      setRawThumbImage("");
      setShowCropper(false);
      setTimeout(() => setProfileMsg(null), 3000);
      return;
    }

    setThumbFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setRawThumbImage(reader.result);
        setShowCropper(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const applyCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    // square crop, like original CreateThumbnailModal with ratio={1}
    const canvas = cropper.getCroppedCanvas({
      width: 400,
      height: 400,
      imageSmoothingEnabled: true,
    });

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setThumbnail(dataUrl);
    setThumbDirty(true);
    setShowCropper(false);
  };

  // -----------------------------------
  // Refresh profile & localStorage
  // -----------------------------------
  const refreshCeflixAuth = async () => {
    if (!token) return;

    try {
      const resp = await fetch(API_BASE + "user/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({ token }),
      });

      const data = await resp.json();

      if (data?.status && data.data && typeof window !== "undefined") {
        let prev: any = null;
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          if (raw) prev = JSON.parse(raw);
        } catch (e) {
          console.error("Failed to read existing auth from storage", e);
        }

        const newState = {
          token: data.data.token ?? prev?.token ?? null,
          user: data.data ?? prev?.user ?? null,
          purchaseToken: prev?.purchaseToken ?? null,
          encID: prev?.encID ?? null,
        };

        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        } catch (e) {
          console.error("Failed to save updated auth to storage", e);
        }

        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to refresh ceflix_auth", err);
    }
  };

  // -----------------------------------
  // Password update
  // -----------------------------------
  async function updatePassword(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    setLoadingPassword(true);
    setPasswordShowBanner(false);
    setPasswordError(false);
    setPasswordErrorMsg("");

    if (password !== confirmPassword) {
      setPasswordErrorMsg("Passwords do not match");
      setPasswordError(true);
      setLoadingPassword(false);
      setPasswordShowBanner(true);
      return;
    }

    try {
      const response = await fetch(API_BASE + "user/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({
          current_password: oldPassword,
          password: password.trim(),
          password_confirmation: confirmPassword,
          token,
        }),
      });

      const data = await response.json();

      if (!data.status) {
        setPasswordErrorMsg(data.message || "Unable to update password.");
        setPasswordError(true);
      } else {
        setPasswordError(false);
        setOldPassword("");
        setPassword("");
        setConfirmPassword("");
        await refreshCeflixAuth();
      }
    } catch {
      setPasswordErrorMsg("Something went wrong. Please try again.");
      setPasswordError(true);
    } finally {
      setLoadingPassword(false);
      setPasswordShowBanner(true);
    }
  }

  // -----------------------------------
  // Profile picture update
  // -----------------------------------
  async function updateProfilePicture() {
    if (!token || !thumbnail) return;

    setLoadingProfile(true);
    setProfileMsg(null);
    setProfileError(false);

    try {
      const req = await fetch(API_BASE + "user/profile/picture", {
        method: "PATCH",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Request-Method": "POST",
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({ image: thumbnail, token }),
      });

      const res = await req.json();

      if (!res.status) {
        setProfileError(true);
        setProfileMsg(res.message || "Unable to update profile picture.");
      } else {
        setProfileError(false);
        setProfileMsg("Profile picture updated.");
        setThumbDirty(false);
        await refreshCeflixAuth();
      }
    } catch {
      setProfileError(true);
      setProfileMsg("Something went wrong. Please try again.");
    } finally {
      setLoadingProfile(false);
      setTimeout(() => setProfileMsg(null), 3000);
    }
  }

  // -----------------------------------
  // Personal info update
  // -----------------------------------
  async function updatePersonalInfo(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    setLoadingInfo(true);
    setInfoMsg(null);
    setInfoError(false);

    try {
      const req = await fetch(API_BASE + "user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({
          fname: fName,
          lname: lName,
          email,
          phone,
          bio: about,
          token,
        }),
      });

      const res = await req.json();

      if (!res.status) {
        setInfoError(true);
        setInfoMsg(res.message || "Unable to update profile.");
      } else {
        setInfoError(false);
        setInfoMsg("Profile updated.");
        await refreshCeflixAuth();
      }
    } catch {
      setInfoError(true);
      setInfoMsg("Something went wrong. Please try again.");
    } finally {
      setLoadingInfo(false);
      setTimeout(() => setInfoMsg(null), 3000);
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-24 pb-10">
          <h1 className="text-2xl font-semibold mb-2">Settings</h1>
          <p className="text-sm text-neutral-400">
            You need to be signed in to manage your settings.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="divide-y divide-white/5">
        {/* Picture */}
        <section className="grid max-w-5xl mx-auto grid-cols-1 gap-x-8 gap-y-10 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <h2 className="text-base font-semibold leading-7 text.white">
              Picture
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-400">
              Your profile picture will appear where your channel is presented
              on Ceflix, like next to your videos and comments.
            </p>
          </div>

          <div className="md:col-span-2 flex flex-col gap-4">
            {/* Avatar + info */}
            <div className="grid grid-cols-6 items-center justify-start gap-4">
              <div className="col-span-3 flex flex-col items-center">
                <div className="relative h-32 w-32 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center">
                  {thumbnail ? (
                    <Image
                      src={thumbnail}
                      alt="Profile picture"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-xs text-neutral-400">
                      Add picture
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/60 opacity-0 hover:opacity-100 transition pointer-events-none">
                    <CameraIcon className="h-8 w-8 text-white/80" />
                  </div>
                </div>
              </div>

              <div className="col-span-3 flex flex-col items-start text-sm text-neutral-300">
                <p>
                  Use an image that’s at least{" "}
                  <span className="font-semibold text-white">98 × 98px</span>{" "}
                  and 2MB or less. PNG or JPG recommended.
                </p>
                <p className="mt-1 text-sm text-neutral-400">
                  Make sure your picture follows the Ceflix Community
                  Guidelines.
                </p>

                <label className="mt-3 inline-flex items-center px-3 py-2 bg-neutral-950 rounded-md border border-neutral-700 cursor-pointer text-sm font-semibold hover:bg-neutral-900">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleThumbFileChange}
                  />
                  Change picture
                  {thumbFileName && (
                    <span className="ml-3 text-sm text-neutral-300 truncate max-w-[180px]">
                      {thumbFileName}
                    </span>
                  )}
                </label>
              </div>
            </div>

            {/* Cropper (inline) */}
            {showCropper && rawThumbImage && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-neutral-400">
                  Adjust your picture (1:1).
                </p>
                <div className="w-full max-w-md border border-neutral-700 rounded-md overflow-hidden bg-neutral-950">
                  <Cropper
                    ref={cropperRef}
                    style={{ width: "100%", height: 260 }}
                    src={rawThumbImage}
                    aspectRatio={1}
                    viewMode={1}
                    background={false}
                    guides
                    zoomable
                    movable
                    responsive
                    dragMode="move"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="cursor-pointer px-3 py-1.5 rounded-full bg-white hover:bg-white/80 text-sm font-semibold"
                    onClick={applyCrop}
                  >
                    Apply crop
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer px-3 py-1.5 rounded-full border border-neutral-700 text-sm"
                    onClick={() => setShowCropper(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Save picture */}
            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={updateProfilePicture}
                disabled={loadingProfile || !thumbDirty}
                className={`inline-flex items-center rounded-full px-3 py-2 cursor-pointer text-sm font-semibold shadow-sm ${
                  loadingProfile || !thumbDirty
                    ? "bg-white text-black cursor-not-allowed"
                    : "bg-white hover:bg-white/80 text-black"
                }`}
              >
                {loadingProfile ? "Saving…" : "Save"}
              </button>
              {profileMsg && (
                <p
                  className={`text-xs ${
                    profileError ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {profileMsg}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Personal information */}
        <section className="grid max-w-5xl mx-auto grid-cols-1 gap-x-8 gap-y-10 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <h2 className="text-base font-semibold leading-7 text.white">
              Personal information
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-400">
              Keep your personal details up to date. This information won’t be
              publicly visible.
            </p>
          </div>

          <form className="md:col-span-2" onSubmit={updatePersonalInfo}>
            <div className="grid grid-cols-1 gap-x-6 gap-y-6 max-w-xl sm:grid-cols-6 text-sm">
              <div className="sm:col-span-3">
                <label className="block font-medium text.white">
                  First name
                </label>
                <input
                  type="text"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  className="mt-2 block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-medium text.white">
                  Last name
                </label>
                <input
                  type="text"
                  value={lName}
                  onChange={(e) => setLName(e.target.value)}
                  className="mt-2 block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-medium text.white">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-medium text.white">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 sm:text-sm"
                />
              </div>

              <div className="col-span-full">
                <label className="block font-medium text.white">Username</label>
                <input
                  type="text"
                  value={user.username || ""}
                  disabled
                  className="mt-2 block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-neutral-400 shadow-sm ring-1 ring-inset ring-white/10 sm:text-sm"
                />
              </div>

              <div className="col-span-full">
                <label className="block font-medium text.white">About</label>
                <textarea
                  value={about || ""}
                  rows={3}
                  onChange={(e) => setAbout(e.target.value)}
                  className="mt-2 block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 sm:text-sm"
                />
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button
                type="submit"
                disabled={loadingInfo}
                className={`rounded-full px-3 py-2 cursor-pointer text-sm font-semibold shadow-sm ${
                  loadingInfo
                    ? "bg-white text-black cursor-not-allowed"
                    : "bg-white hover:bg-white/80 text-black"
                }`}
              >
                {loadingInfo ? "Saving…" : "Save"}
              </button>
              {infoMsg && (
                <p
                  className={`text-xs ${
                    infoError ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {infoMsg}
                </p>
              )}
            </div>
          </form>
        </section>

        {/* Change password */}
        <section className="grid max-w-5xl mx-auto grid-cols-1 gap-x-8 gap-y-10 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <h2 className="text-base font-semibold leading-7 text.white">
              Change password
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-400">
              Update the password associated with your account.
            </p>
          </div>

          <form className="md:col-span-2" onSubmit={updatePassword}>
            <div className="grid grid-cols-1 gap-x-6 gap-y-6 max-w-xl sm:grid-cols-6 text-sm">
              <div className="col-span-full">
                <label className="block font-medium text.white">
                  Current password
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="mt-2 block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 sm:text-sm"
                />
              </div>

              <div className="col-span-full">
                <label className="block font-medium text.white">
                  New password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 sm:text-sm"
                />
              </div>

              <div className="col-span-full">
                <label className="block font-medium text.white">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2 block w-full rounded-md border-0 bg-white/5  px-3 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 sm:text-sm"
                />
              </div>
            </div>

            {passwordShowBanner && (
              <div className="flex items-start mt-4 text-sm">
                <div className="flex-shrink-0">
                  {passwordError ? (
                    <ExclamationCircleIcon
                      className="h-5 w-5 text-red-400"
                      aria-hidden="true"
                    />
                  ) : (
                    <CheckCircleIcon
                      className="h-5 w-5 text-emerald-400"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="ml-3">
                  {passwordError ? (
                    <>
                      <p className="font-medium text-gray-200">Error</p>
                      <p className="mt-1 text-gray-400">{passwordErrorMsg}</p>
                    </>
                  ) : (
                    <p className="font-medium text-white">
                      Your password has been successfully reset.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 flex">
              <button
                type="submit"
                disabled={loadingPassword}
                className={`rounded-full px-3 py-2 cursor-pointer text-sm font-semibold shadow-sm ${
                  loadingPassword
                    ? "bg-white text-black cursor-not-allowed"
                    : "bg-white hover:bg-white/80 text-black"
                }`}
              >
                {loadingPassword ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

// components/ShareModal.tsx
"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  TwitterShareButton,
  FacebookShareButton,
  WhatsappShareButton,
  EmailShareButton,
  TwitterIcon,
  FacebookIcon,
  WhatsappIcon,
  EmailIcon,
} from "react-share";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

import kc_logo from "../assets/logo/kingschat.png";
import Image from "next/image";

type ShareProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  url: string;
  hashtags?: string[]; // optional for Twitter
  id: string; // video id for embed
};

export default function ShareModal({
  open,
  setOpen,
  title,
  url,
  hashtags,
  id,
}: ShareProps) {
  function copyToClipboard() {
    try {
      navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
  }

  function copyEmbedToClipboard() {
    const embed = `<iframe src="https://embed.ceflix.org/video/${id}" width="560" height="315" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    try {
      navigator.clipboard.writeText(embed);
    } catch {
      // ignore
    }
  }

  const embedCode = `<iframe src="https://embed.ceflix.org/video/${id}" width="560" height="315" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[9999]" onClose={setOpen}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-neutral-900/70 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-[10000] w-screen overflow-y-auto text-white">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-neutral-800 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="font-bold text-md">Share</h1>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-full p-1 hover:bg-neutral-700"
                  >
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex flex-col">
                  {/* icons row */}
                  <div className="mt-2 flex flex-wrap justify-between gap-4">
                    {/* Kingschat */}
                    <div className="flex flex-col items-center justify-center cursor-pointer">
                      <Link
                        href="https://kingschat.online/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center"
                      >
                        <div className="w-[60px] h-[60px] rounded-full bg-white p-2 flex items-center justify-center">
                          {/* replace src with your actual kingschat logo path */}
                          <Image
                            src={kc_logo}
                            alt="Kingschat"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="mt-1 text-xs">Kingschat</span>
                      </Link>
                    </div>

                    {/* Twitter */}
                    <div className="flex flex-col items-center justify-center cursor-pointer">
                      <TwitterShareButton
                        title={title}
                        url={url}
                        hashtags={hashtags}
                      >
                        <TwitterIcon size={60} round />
                      </TwitterShareButton>
                      <span className="mt-1 text-xs">Twitter</span>
                    </div>

                    {/* Facebook */}
                    <div className="flex flex-col items-center justify-center cursor-pointer">
                      <FacebookShareButton url={url} quote={title}>
                        <FacebookIcon size={60} round />
                      </FacebookShareButton>
                      <span className="mt-1 text-xs">Facebook</span>
                    </div>

                    {/* WhatsApp */}
                    <div className="flex flex-col items-center justify-center cursor-pointer">
                      <WhatsappShareButton title={title} url={url}>
                        <WhatsappIcon size={60} round />
                      </WhatsappShareButton>
                      <span className="mt-1 text-xs">WhatsApp</span>
                    </div>

                    {/* Email */}
                    <div className="flex flex-col items-center justify-center cursor-pointer">
                      <EmailShareButton subject={title} body={url}>
                        <EmailIcon size={60} round />
                      </EmailShareButton>
                      <span className="mt-1 text-xs">Email</span>
                    </div>
                  </div>

                  {/* Direct link */}
                  <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-neutral-600 bg-neutral-900 px-3 py-2">
                    <span className="text-xs sm:text-sm break-all">{url}</span>
                    <button
                      type="button"
                      onClick={copyToClipboard}
                      className="cursor-pointer font-semibold shrink-0 rounded-full bg-red-700 px-3 py-2 text-xs font-medium text-white hover:bg-red-600"
                    >
                      Copy
                    </button>
                  </div>

                  {/* Embed */}
                  <span className="mt-6 text-sm font-bold">Embed Video</span>
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-neutral-600 bg-neutral-900 px-3 py-2">
                    <span className="text-[10px] sm:text-xs break-all">
                      {embedCode}
                    </span>
                    <button
                      type="button"
                      onClick={copyEmbedToClipboard}
                      className="cursor-pointer font-semibold shrink-0 rounded-full bg-red-700 px-3 py-2 text-xs font-medium text-white hover:bg-red-600"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

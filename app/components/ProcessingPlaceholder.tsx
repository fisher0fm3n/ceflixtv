"use client";

/**
 * Shown in place of the player while a video is still being encoded.
 *
 * The API withholds playback URLs until `processingStatus` flips to ready, so
 * without this the player would be handed a null source — or, before that
 * change, a CDN path that 403s and surfaces as "media not found".
 */
export default function ProcessingPlaceholder({
  poster,
  message,
}: {
  poster?: string;
  message?: string | null;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg bg-neutral-950">
      {poster ? (
        // Blurred and dimmed so it reads as a placeholder rather than a frame
        // the viewer is waiting to see play.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-md"
        />
      ) : null}

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <span
          className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-sky-400"
          aria-hidden="true"
        />

        <div>
          <p className="text-base font-semibold text-white">
            Processing your video
          </p>
          <p className="mt-1 max-w-md text-sm leading-6 text-neutral-400">
            {message ||
              "This video is still being processed. It will be ready to watch shortly."}
          </p>
          <p className="mt-3 text-xs text-neutral-500">
            This page will start playing on its own once it&apos;s ready.
          </p>
        </div>
      </div>
    </div>
  );
}

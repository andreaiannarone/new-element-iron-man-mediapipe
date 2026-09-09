import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { COPY, LANGUAGES, detectLang, storeLang, type LangCode } from './aboutTranslations';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

const TECH = ['Three.js', 'MediaPipe', 'WebGL', 'React 19'];

/**
 * Project info panel.
 *
 * Uses the native <dialog> element so the browser handles the top layer,
 * the Escape key, focus trapping and making the rest of the page inert -
 * which matters here, since the experience behind it is a full-screen canvas.
 */
const AboutDialog: React.FC<AboutDialogProps> = ({ open, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [lang, setLang] = useState<LangCode>('en');
  const t = COPY[lang];

  // Resolved after mount so the first paint does not depend on storage or navigator.
  useEffect(() => {
    setLang(detectLang());
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // Without this the browser focuses the first control (the close button),
      // which then shows its focus ring as soon as the panel appears.
      dialog.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const changeLang = (next: LangCode) => {
    setLang(next);
    storeLang(next);
  };

  // Clicking the backdrop targets the dialog itself; clicking the panel targets a child.
  const handleClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={handleClick}
      aria-labelledby="about-title"
      tabIndex={-1}
      lang={lang}
      className="m-auto focus:outline-none w-[calc(100%_-_2rem)] max-w-[44rem] max-h-[92dvh] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#09090b]/95 p-0 text-white shadow-2xl backdrop-blur-xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="relative p-6 sm:p-8 sm:pt-6 sm:pb-6">

        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
          title={t.close}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-wrap items-center gap-3 pr-12">
          <div className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            <span className="font-mono text-[10px] font-bold tracking-wider text-white uppercase">
              {t.badge}
            </span>
          </div>

          <div
            role="group"
            aria-label={t.languageLabel}
            className="flex w-fit items-center gap-0.5 rounded-full border border-white/10 bg-white/5 p-0.5"
          >
            {LANGUAGES.map((language) => {
              const active = language.code === lang;
              return (
                <button
                  key={language.code}
                  type="button"
                  lang={language.code}
                  onClick={() => changeLang(language.code)}
                  aria-pressed={active}
                  className={`rounded-full px-2 py-1 font-mono text-[10px] font-bold tracking-wider uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                    active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {language.label}
                </button>
              );
            })}
          </div>
        </div>

        <h2 id="about-title" className="mt-4 text-2xl font-bold text-white sm:text-3xl">
          New Element
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-white">
          {t.introBefore}<em>Iron Man 2</em>{t.introAfter}
        </p>

        <h3 className="mt-5 font-mono text-[11px] font-bold tracking-[0.18em] text-white uppercase">
          {t.howItWorks}
        </h3>
        <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-white">
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <span>
              <strong className="text-white">{t.headTitle}</strong> - {t.headBody}
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <span>
              <strong className="text-white">{t.pinchTitle}</strong> - {t.pinchBody}
            </span>
          </li>
        </ul>

        <h3 className="mt-5 font-mono text-[11px] font-bold tracking-[0.18em] text-white uppercase">
          {t.privacy}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-white">
          {t.privacyBody}
        </p>

        <h3 className="mt-5 font-mono text-[11px] font-bold tracking-[0.18em] text-white uppercase">
          {t.builtWith}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {TECH.map((tech) => (
            <span
              key={tech}
              className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider text-white uppercase"
            >
              {tech}
            </span>
          ))}
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          {/* Signature line: stays in English in every language. */}
          <p className="text-xs tracking-wider text-white uppercase" lang="en">
            Creative experience by{' '}
            <a
              href="https://andreaiannarone.com"
              target="_blank"
              rel="author noopener noreferrer"
              className="font-bold text-white transition-colors hover:text-white/70"
            >
              Andrea Iannarone
            </a>
          </p>
          <p className="mt-2.5 font-mono text-[10px] leading-relaxed tracking-wide text-white uppercase">
            {t.disclaimer}
          </p>
        </div>

      </div>
    </dialog>
  );
};

export default AboutDialog;

/**
 * Copy for the About panel.
 *
 * To add a language: add its code to LANGUAGES and a matching entry to COPY.
 * `credit` stays in English on purpose - it is the author's signature line.
 */

export type LangCode = 'en' | 'it' | 'es' | 'fr' | 'de';

export const LANGUAGES: { code: LangCode; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'it', label: 'IT' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'de', label: 'DE' },
];

export interface AboutCopy {
  badge: string;
  /** Split around the film title, which is rendered in italics. */
  introBefore: string;
  introAfter: string;
  howItWorks: string;
  headTitle: string;
  headBody: string;
  pinchTitle: string;
  pinchBody: string;
  privacy: string;
  privacyBody: string;
  builtWith: string;
  disclaimer: string;
  close: string;
  languageLabel: string;
}

export const COPY: Record<LangCode, AboutCopy> = {
  en: {
    badge: 'About the project',
    introBefore:
      'An interactive WebGL experience that turns your webcam into a controller. It is a tribute to the “new element” laboratory scene from ',
    introAfter: ', rebuilt as a real-time demo of markerless face and hand tracking on the open web.',
    howItWorks: 'How it works',
    headTitle: 'Move your head',
    headBody: 'MediaPipe FaceMesh reads your facial landmarks and pans the camera, so the 3D room shifts with you.',
    pinchTitle: 'Pinch to zoom',
    pinchBody:
      'The distance between your thumb and index finger scales the particle sphere. Spread them to expand it, close them to shrink it.',
    privacy: 'Privacy',
    privacyBody:
      'Everything runs on your device. The webcam stream is processed locally in the browser and is never recorded, uploaded or sent to a server.',
    builtWith: 'Built with',
    disclaimer: 'Independent fan project - not affiliated with Marvel or The Walt Disney Company.',
    close: 'Close',
    languageLabel: 'Language',
  },
  it: {
    badge: 'Il progetto',
    introBefore:
      'Un’esperienza WebGL interattiva che trasforma la tua webcam in un controller. È un omaggio alla scena di laboratorio del «nuovo elemento» di ',
    introAfter:
      ', ricostruita come demo in tempo reale di tracciamento del volto e delle mani senza marcatori, sul web aperto.',
    howItWorks: 'Come funziona',
    headTitle: 'Muovi la testa',
    headBody:
      'MediaPipe FaceMesh legge i punti del tuo volto e sposta la camera, così la stanza 3D si muove insieme a te.',
    pinchTitle: 'Pizzica per zoomare',
    pinchBody:
      'La distanza tra pollice e indice ridimensiona la sfera di particelle. Allontanali per espanderla, avvicinali per rimpicciolirla.',
    privacy: 'Privacy',
    privacyBody:
      'Tutto viene elaborato sul tuo dispositivo. Il flusso della webcam resta nel browser e non viene mai registrato, caricato o inviato a un server.',
    builtWith: 'Realizzato con',
    disclaimer: 'Progetto amatoriale indipendente - non affiliato a Marvel o The Walt Disney Company.',
    close: 'Chiudi',
    languageLabel: 'Lingua',
  },
  es: {
    badge: 'El proyecto',
    introBefore:
      'Una experiencia WebGL interactiva que convierte tu cámara web en un mando. Es un homenaje a la escena del laboratorio del «nuevo elemento» de ',
    introAfter:
      ', reconstruida como una demo en tiempo real de seguimiento facial y de manos sin marcadores en la web abierta.',
    howItWorks: 'Cómo funciona',
    headTitle: 'Mueve la cabeza',
    headBody:
      'MediaPipe FaceMesh lee los puntos de tu rostro y desplaza la cámara, de modo que la sala 3D se mueve contigo.',
    pinchTitle: 'Pellizca para hacer zoom',
    pinchBody:
      'La distancia entre el pulgar y el índice escala la esfera de partículas. Sepáralos para ampliarla, júntalos para reducirla.',
    privacy: 'Privacidad',
    privacyBody:
      'Todo se procesa en tu dispositivo. El vídeo de la cámara permanece en el navegador y nunca se graba, se sube ni se envía a un servidor.',
    builtWith: 'Hecho con',
    disclaimer: 'Proyecto de fans independiente: sin afiliación con Marvel ni The Walt Disney Company.',
    close: 'Cerrar',
    languageLabel: 'Idioma',
  },
  fr: {
    badge: 'Le projet',
    introBefore:
      'Une expérience WebGL interactive qui transforme votre webcam en manette. C’est un hommage à la scène du laboratoire du « nouvel élément » d’',
    introAfter:
      ', recréée comme une démo en temps réel de suivi du visage et des mains sans marqueurs sur le web ouvert.',
    howItWorks: 'Comment ça marche',
    headTitle: 'Bougez la tête',
    headBody:
      'MediaPipe FaceMesh lit les points de votre visage et déplace la caméra : la pièce 3D bouge avec vous.',
    pinchTitle: 'Pincez pour zoomer',
    pinchBody:
      'La distance entre le pouce et l’index met la sphère de particules à l’échelle. Écartez-les pour l’agrandir, rapprochez-les pour la réduire.',
    privacy: 'Confidentialité',
    privacyBody:
      'Tout est traité sur votre appareil. Le flux de la webcam reste dans le navigateur et n’est jamais enregistré, téléversé ni envoyé à un serveur.',
    builtWith: 'Réalisé avec',
    disclaimer: 'Projet de fan indépendant - sans lien avec Marvel ou The Walt Disney Company.',
    close: 'Fermer',
    languageLabel: 'Langue',
  },
  de: {
    badge: 'Das Projekt',
    introBefore:
      'Ein interaktives WebGL-Erlebnis, das deine Webcam zum Controller macht. Eine Hommage an die Laborszene mit dem „neuen Element“ aus ',
    introAfter:
      ' - neu gebaut als Echtzeit-Demo für markerloses Gesichts- und Hand-Tracking im offenen Web.',
    howItWorks: 'So funktioniert es',
    headTitle: 'Bewege den Kopf',
    headBody:
      'MediaPipe FaceMesh liest die Punkte deines Gesichts und schwenkt die Kamera, sodass sich der 3D-Raum mit dir bewegt.',
    pinchTitle: 'Zum Zoomen zusammenkneifen',
    pinchBody:
      'Der Abstand zwischen Daumen und Zeigefinger skaliert die Partikelkugel. Spreize sie zum Vergrößern, führe sie zum Verkleinern zusammen.',
    privacy: 'Datenschutz',
    privacyBody:
      'Alles läuft auf deinem Gerät. Der Webcam-Stream bleibt im Browser und wird nie aufgezeichnet, hochgeladen oder an einen Server gesendet.',
    builtWith: 'Gebaut mit',
    disclaimer: 'Unabhängiges Fanprojekt - nicht mit Marvel oder The Walt Disney Company verbunden.',
    close: 'Schließen',
    languageLabel: 'Sprache',
  },
};

const STORAGE_KEY = 'ne-about-lang';

const isLangCode = (value: string): value is LangCode =>
  LANGUAGES.some((language) => language.code === value);

/** Stored choice first, then the browser's preferred language, then English. */
export const detectLang = (): LangCode => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isLangCode(stored)) return stored;
  } catch {
    // Private mode or blocked storage: fall through to the browser language.
  }

  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag?.slice(0, 2).toLowerCase();
    if (base && isLangCode(base)) return base;
  }

  return 'en';
};

export const storeLang = (lang: LangCode): void => {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Persisting the choice is a convenience, never a requirement.
  }
};

// Fabrique l'interface en fichiers statiques, pour qu'elle soit embarquée dans
// l'app iPhone et Android.
//
// Pourquoi un script plutôt qu'une simple option : l'app ne doit contenir que
// l'interface. Les 22 routes serveur restent sur Vercel, et trois pages n'ont
// rien à faire dans l'app :
//
//   app/api         les routes serveur, qui ne peuvent pas être statiques
//   app/moderation  ton écran d'administration, réservé au navigateur
//   app/p et app/u  les pages publiques de partage, qui s'ouvrent dans un
//                   navigateur quand quelqu'un reçoit un lien
//
// Next.js n'a pas d'option « exclure ces dossiers ». On les met donc de côté le
// temps de la compilation, et on les remet ensuite, quoi qu'il arrive.

import { cp, rm, rename, mkdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const EXCLUS = ['api', 'moderation', 'p', 'u'];
const GARDE = '.build-app-mis-de-cote';

async function existe(chemin) {
  try { await access(chemin); return true; } catch { return false; }
}

async function mettreDeCote() {
  await mkdir(GARDE, { recursive: true });
  for (const nom of EXCLUS) {
    if (await existe(`app/${nom}`)) await rename(`app/${nom}`, `${GARDE}/${nom}`);
  }
}

async function remettre() {
  for (const nom of EXCLUS) {
    if (await existe(`${GARDE}/${nom}`)) {
      await rm(`app/${nom}`, { recursive: true, force: true });
      await rename(`${GARDE}/${nom}`, `app/${nom}`);
    }
  }
  await rm(GARDE, { recursive: true, force: true });
}

// Si une compilation précédente s'est arrêtée brutalement, les dossiers sont
// encore de côté. On les remet avant toute chose, sinon on les perdrait.
if (existsSync(GARDE)) {
  console.log('Restes d’une compilation interrompue, je remets les dossiers en place.');
  await remettre();
}

console.log('Mise de côté des routes serveur...');
await mettreDeCote();

let code = 1;
try {
  console.log('Compilation de l’interface...');
  const r = spawnSync('npx', ['next', 'build'], {
    stdio: 'inherit',
    env: { ...process.env, BUILD_APP: '1' },
    shell: process.platform === 'win32',
  });
  code = r.status ?? 1;
} finally {
  console.log('Remise en place des routes serveur...');
  await remettre();
}

if (code !== 0) {
  console.error('\nLa compilation a échoué. Les dossiers ont été remis en place.');
  process.exit(code);
}

// Le modèle de modération et la liste des villes vivent dans public/ et sont
// déjà recopiés par Next.js dans out/. On vérifie, parce que sans eux l'app
// refuserait toutes les photos et ne trouverait aucune ville.
for (const fichier of ['out/nsfw/model.json', 'out/cities.json']) {
  if (!existsSync(fichier)) {
    console.error(`\nFichier manquant dans la compilation : ${fichier}`);
    process.exit(1);
  }
}

console.log('\nInterface compilée dans out/. Prête à être embarquée dans l’app.');

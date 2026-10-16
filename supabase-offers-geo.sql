-- Les coordonnées des projets, pour le classement par proximité.
--
-- À coller une seule fois dans l'éditeur SQL de Supabase.
--
-- Un projet ne portait jusqu'ici que le NOM de sa ville, écrit à la main ou
-- choisi dans la liste. Un nom ne permet pas de calculer une distance : il
-- fallait soit télécharger les 765 Ko de la liste mondiale des villes à chaque
-- ouverture de l'onglet Projets pour y retrouver chaque ville, soit retenir les
-- coordonnées une bonne fois au moment de la publication. C'est le second.
--
-- Rien n'est obligatoire : un projet sans coordonnées reste publié, visible et
-- trouvable par son nom de ville. Il se range simplement en fin de liste quand
-- on demande les plus proches, ce qui est honnête : on ignore où il est.

alter table public.offers
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Les projets déjà publiés n'ont pas de coordonnées. Ils ne sont pas perdus :
-- le rattrapage quotidien (app/lib/backfill-cities.ts) retrouve leur ville dans
-- la liste mondiale à partir de son nom et remplit les deux colonnes au prochain
-- passage. L'écran de modération a un bouton pour le déclencher tout de suite.

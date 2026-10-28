export type ElementId =
  | 'fire' | 'water' | 'nature' | 'earth' | 'air' | 'telekinesis'
  | 'darkness' | 'light' | 'ice' | 'cosmic' | 'time' | 'space-time'
  | 'creation' | 'storm' | 'unknown'

export type EffectTiming = 'main' | 'response'

export interface RuneDefinition {
  id: string
  baseRuneId: string
  variant: 'standard' | 'alter'
  name: string
  element: ElementId
  effectId: string
  effectName: string
  effectText: string
  rulingText: string
  timing: EffectTiming
  color: number
  strengths: ElementId[]
}

export type SpiritEffectId =
  | 'flamberge-oath' | 'flame-god-reign' | 'samya-thread' | 'tiona-rush'
  | 'twin-resonance' | 'isir-winter' | 'shaka-sanctuary' | 'shaka-cycle'
  | 'shaka-arayashiki' | 'gold-aegis' | 'morgane-pyre' | 'roshi-tempest'
  | 'serena-dominion' | 'rubberband-miracle' | 'diego-blueprint'

export interface SpiritDefinition {
  id: string
  name: string
  element: ElementId
  effectId: SpiritEffectId
  effectName: string
  effectText: string
  lore: string
  imageUrl: string
  color: number
  bonds: string[]
  requirements: Array<{ element: ElementId; count: number }>
}

export const spirits: SpiritDefinition[] = [
  { id: 'spirit-diego', name: 'Shao Raizan, Héritier de la Ligne', element: 'creation', effectId: 'diego-blueprint', effectName: 'Règle de la Ligne', effectText: 'Crée 1 rune, accorde 1 invocation supplémentaire et réveille le pouvoir d’une rune alliée.', lore: 'À la jonction des quatre domaines, Shao transforme chaque affrontement en nouvelle voie.', imageUrl: '/assets/spirits/azuki/diego.webp?v=portraits-da-1', color: 0xffb04f, bonds: [], requirements: [{ element: 'creation', count: 2 }, { element: 'nature', count: 1 }] },
  { id: 'spirit-flamberge', name: 'Reika, Lame du Brasier', element: 'fire', effectId: 'flamberge-oath', effectName: 'Serment du Brasier', effectText: 'Inflige 2 dégâts directs, puis rend son assaut à votre première rune épuisée.', lore: 'Sa lame marque la frontière entre la chaleur qui protège et le feu qui dévore.', imageUrl: '/assets/spirits/azuki/flamberge.webp?v=portraits-da-1', color: 0xff6b3d, bonds: ['spirit-flame-god'], requirements: [{ element: 'fire', count: 3 }] },
  { id: 'spirit-flame-god', name: 'Alliance du Brasier et de l’Orage', element: 'fire', effectId: 'flame-god-reign', effectName: 'Accord fulminant', effectText: 'Détruit la première rune adverse révélée et embrase son duelliste pour 1 dégât.', lore: 'Reika ouvre la voie dans les flammes avant que Raiko ne referme l’étau sous un tonnerre implacable.', imageUrl: '/assets/spirits/azuki/flame-god.webp?v=portraits-da-1', color: 0xff3d24, bonds: ['spirit-flamberge', 'spirit-tiona'], requirements: [{ element: 'fire', count: 2 }, { element: 'storm', count: 1 }] },
  { id: 'spirit-samya', name: 'Misora, Tisseuse d’Ondes', element: 'telekinesis', effectId: 'samya-thread', effectName: 'Fil des Marées', effectText: 'Pioche 1 rune, puis réveille le pouvoir d’une rune alliée épuisée.', lore: 'Elle sent les intentions comme des courants invisibles avant leur déferlement.', imageUrl: '/assets/spirits/azuki/samya.webp?v=portraits-da-7', color: 0x9a70ff, bonds: ['spirit-tiona', 'spirit-twin-stars'], requirements: [{ element: 'telekinesis', count: 2 }, { element: 'water', count: 1 }] },
  { id: 'spirit-tiona', name: 'Raiko, Moine de l’Orage', element: 'storm', effectId: 'tiona-rush', effectName: 'Poing du Tonnerre', effectText: 'Toutes vos runes en assaut peuvent attaquer une fois supplémentaire ce tour.', lore: 'Cloudreader du domaine de la Foudre, Raiko atteint l’éveil au cœur même de l’orage.', imageUrl: '/assets/spirits/azuki/tiona.webp?v=portraits-da-1', color: 0x58d9ff, bonds: ['spirit-samya', 'spirit-twin-stars'], requirements: [{ element: 'storm', count: 3 }] },
  { id: 'spirit-twin-stars', name: 'Union des Quatre Domaines', element: 'creation', effectId: 'twin-resonance', effectName: 'Résonance des Alliés', effectText: 'Crée 2 runes dans votre main et accorde 1 invocation supplémentaire ce tour.', lore: 'Des combattants que tout opposait alignent leurs forces et donnent naissance à une possibilité nouvelle.', imageUrl: '/assets/spirits/azuki/tiona-samya.webp?v=portraits-da-1', color: 0xd98cff, bonds: ['spirit-samya', 'spirit-tiona'], requirements: [{ element: 'telekinesis', count: 2 }, { element: 'storm', count: 1 }] },
  { id: 'spirit-isir', name: 'Plasma Glacial', element: 'ice', effectId: 'isir-winter', effectName: 'Décharge cryonique', effectText: 'Neutralise toutes les runes adverses révélées jusqu’au prochain tour de leur maître.', lore: 'La foudre blanchit le ciel, se condense en plasma et fige le champ de bataille dans son sillage.', imageUrl: '/assets/spirits/azuki/isir.webp?v=portraits-da-1', color: 0xbfeeff, bonds: [], requirements: [{ element: 'ice', count: 2 }, { element: 'storm', count: 1 }] },
  { id: 'spirit-shaka', name: 'Momo, Esprit Blanc', element: 'light', effectId: 'shaka-sanctuary', effectName: 'Sanctuaire Blanc', effectText: 'Rend 2 PV et protège toutes vos runes de leur prochaine destruction au combat.', lore: 'Une présence minuscule suffit parfois à préserver toute une ligne.', imageUrl: '/assets/spirits/azuki/shaka.webp?v=portraits-da-1', color: 0xffe58c, bonds: ['spirit-shaka-cycle', 'spirit-shaka-arayashiki'], requirements: [{ element: 'light', count: 3 }] },
  { id: 'spirit-shaka-cycle', name: 'Course du Cycle Blanc', element: 'time', effectId: 'shaka-cycle', effectName: 'Cycle Élémentaire', effectText: 'Récupère jusqu’à 2 runes du cimetière et accorde 1 invocation supplémentaire.', lore: 'Momo fend le courant du temps et ramène dans la course ce que le duel croyait perdu.', imageUrl: '/assets/spirits/azuki/shaka-cycle.webp?v=portraits-da-1', color: 0xe8c45d, bonds: ['spirit-shaka', 'spirit-shaka-arayashiki'], requirements: [{ element: 'light', count: 2 }, { element: 'time', count: 1 }] },
  { id: 'spirit-shaka-arayashiki', name: 'Fracture Céleste', element: 'cosmic', effectId: 'shaka-arayashiki', effectName: 'Vision des Quatre Domaines', effectText: 'Pioche 2 runes et accorde l’avantage élémentaire à toutes vos runes ce tour.', lore: 'Quand les éléments entrent en collision, le ciel se fend et révèle simultanément chaque domaine.', imageUrl: '/assets/spirits/azuki/shaka-arayashiki.webp?v=portraits-da-1', color: 0xf6d778, bonds: ['spirit-shaka', 'spirit-shaka-cycle'], requirements: [{ element: 'cosmic', count: 2 }, { element: 'air', count: 1 }] },
  { id: 'spirit-gold', name: 'Impact Tellurique', element: 'earth', effectId: 'gold-aegis', effectName: 'Égide de la Terre', effectText: 'Protège toutes vos runes et rend 1 PV.', lore: 'Après la frappe du Masque, la terre absorbe le choc, éclate et transforme le champ de bataille en forteresse.', imageUrl: '/assets/spirits/azuki/gold.webp?v=portraits-da-1', color: 0xe8b94f, bonds: ['spirit-diego'], requirements: [{ element: 'earth', count: 2 }, { element: 'light', count: 1 }] },
  { id: 'spirit-morgane', name: 'Duel du Masque Ardent', element: 'darkness', effectId: 'morgane-pyre', effectName: 'Bûcher Noir', effectText: 'Détruit la première rune adverse et bannit la première rune de son cimetière.', lore: 'Le masque s’enflamme et poursuit son adversaire jusqu’à ce qu’il ne reste plus aucun vestige.', imageUrl: '/assets/spirits/azuki/morgane.webp?v=portraits-da-1', color: 0xe75b37, bonds: [], requirements: [{ element: 'fire', count: 2 }, { element: 'darkness', count: 1 }] },
  { id: 'spirit-roshi', name: 'Raz-de-marée de la Ligne', element: 'air', effectId: 'roshi-tempest', effectName: 'Marche des Cent Vents', effectText: 'Renvoie jusqu’à 2 runes adverses dans la main de leur propriétaire.', lore: 'Une vague monumentale traverse l’arène et emporte toute formation incapable de suivre son rythme.', imageUrl: '/assets/spirits/azuki/roshi.webp?v=portraits-da-1', color: 0x9fe9c7, bonds: [], requirements: [{ element: 'air', count: 2 }, { element: 'water', count: 1 }] },
  { id: 'spirit-god-serena', name: 'Convergence des Domaines', element: 'space-time', effectId: 'serena-dominion', effectName: 'Convergence des Domaines', effectText: 'Bannit la première rune adverse, puis pioche 1 rune.', lore: 'Après la rupture, les combattants se rassemblent et les quatre forces de la Ligne ne forment plus qu’une.', imageUrl: '/assets/spirits/azuki/god-serena.webp?v=portraits-da-1', color: 0x527ddd, bonds: [], requirements: [{ element: 'space-time', count: 2 }, { element: 'cosmic', count: 1 }] },
  { id: 'spirit-rubberband', name: 'Alliance Imprévisible', element: 'unknown', effectId: 'rubberband-miracle', effectName: 'Miracle du Renard Rouge', effectText: 'Échange les PV des duellistes si vous êtes en retard ; sinon inflige 1 dégât et rend 1 PV.', lore: 'Des rivaux et des créatures improbables se retrouvent dans la même ligne, unis par un miracle impossible à prévoir.', imageUrl: '/assets/spirits/azuki/rubberband.webp?v=portraits-da-1', color: 0xffcf36, bonds: [], requirements: [{ element: 'unknown', count: 2 }, { element: 'nature', count: 1 }] },
]

export const spiritById = Object.fromEntries(spirits.map((spirit) => [spirit.id, spirit])) as Record<string, SpiritDefinition>

const baseRuneCatalog: Omit<RuneDefinition, 'baseRuneId' | 'variant'>[] = [
  { id: 'fire-ember', name: 'Ember Sigil', element: 'fire', effectId: 'ember-pulse', effectName: 'Impulsion ardente', effectText: 'Inflige 1 dégât direct à l’adversaire.', rulingText: 'Ce pouvoir ne cible et ne détruit aucune rune. Il peut néanmoins être annulé dans une chaîne.', timing: 'main', color: 0xff6b45, strengths: ['nature', 'earth'] },
  { id: 'water-current', name: 'Current Well', element: 'water', effectId: 'tidal-bloom', effectName: 'Floraison de marée', effectText: 'Rend 1 PV. À vos PV maximum, cette rune gagne plutôt un bouclier de combat.', rulingText: 'Le bouclier protège Current Well de sa prochaine destruction au combat, mais ne prévient pas les dégâts subis par son duelliste.', timing: 'main', color: 0x62b6ff, strengths: ['fire', 'earth'] },
  { id: 'nature-root', name: 'Root Exchange', element: 'nature', effectId: 'wild-exchange', effectName: 'Échange sauvage', effectText: 'Sacrifiez cette rune pour prendre le contrôle d’une rune adverse ciblée.', rulingText: 'La cible peut activer son pouvoir en chaîne avant le vol. Nature est sacrifiée lorsque l’échange se résout.', timing: 'main', color: 0x45c96b, strengths: ['water', 'air'] },
  { id: 'electricity-lash', name: 'Static Lash', element: 'storm', effectId: 'static-lock', effectName: 'Verrou statique', effectText: 'Paralyse la première rune adverse pour un tour.', rulingText: 'Une rune paralysée ne peut ni attaquer ni activer son pouvoir. Une attaque déjà déclarée est interrompue si son attaquant est paralysé en chaîne.', timing: 'main', color: 0x54d9ff, strengths: ['water', 'nature'] },
  { id: 'earth-bulwark', name: 'Bulwark Spiral', element: 'earth', effectId: 'stone-guard', effectName: 'Garde de pierre', effectText: 'Protège une rune alliée de sa prochaine destruction au combat.', rulingText: 'Le bouclier sauve la rune, mais ne prévient aucun dégât de combat. L’annulation en chaîne appartient uniquement à sa version Alter.', timing: 'main', color: 0xd5aa52, strengths: ['storm', 'cosmic'] },
  { id: 'air-gale', name: 'Gale Script', element: 'air', effectId: 'gust-banish', effectName: 'Bourrasque de rappel', effectText: 'Renvoyez une rune adverse ciblée dans la main de son propriétaire, même si elle est pleine.', rulingText: 'Le retour n’est pas une destruction. Il peut dépasser la limite de main ; la défausse ne sera imposée qu’après une prochaine pioche.', timing: 'main', color: 0xdfe8af, strengths: ['storm', 'time'] },
  { id: 'telekinesis-orbit', name: 'Orbit Intent', element: 'telekinesis', effectId: 'future-sight', effectName: 'Vision orbitale', effectText: 'Choisissez 1 rune du grimoire et ajoutez-la à votre main.', rulingText: 'Ajouter une rune n’est pas piocher. La main peut dépasser cinq sans défausse immédiate.', timing: 'main', color: 0x71ffa7, strengths: ['air', 'darkness'] },
  { id: 'darkness-veil', name: 'Veil Core', element: 'darkness', effectId: 'veil-drop', effectName: 'Voile plongeant', effectText: 'Passez une rune adverse ciblée en défense voilée.', rulingText: 'Une rune voilée est neutralisée et ne peut pas attaquer. Toute activation de son pouvoir la révèle en défense, pendant son tour comme en réponse.', timing: 'main', color: 0xba55e8, strengths: ['light', 'ice'] },
  { id: 'light-reveal', name: 'Solar Trace', element: 'light', effectId: 'reveal-truth', effectName: 'Trace solaire', effectText: 'Révélez une rune alliée et accordez-lui l’avantage ce tour.', rulingText: 'La rune passe en assaut et gagne l’avantage pour ses combats de ce tour uniquement.', timing: 'main', color: 0xffd84f, strengths: ['darkness', 'telekinesis'] },
  { id: 'ice-lock', name: 'Frozen Mark', element: 'ice', effectId: 'frost-sigil', effectName: 'Sceau de givre', effectText: 'Scelle les pouvoirs d’un élément choisi.', rulingText: 'Le sceau bloque les pouvoirs, pas les attaques. Il disparaît dès que la rune Ice quitte le terrain.', timing: 'main', color: 0xcff9ff, strengths: ['light', 'fire'] },
  { id: 'cosmic-return', name: 'Nebula Recall', element: 'cosmic', effectId: 'astral-return', effectName: 'Retour astral', effectText: 'Reprenez une rune du cimetière. S’il est vide, piochez 1 rune.', rulingText: 'La récupération peut dépasser cinq runes. La pioche de secours respecte la limite de main et peut imposer une défausse.', timing: 'main', color: 0x3d9fff, strengths: ['ice', 'time'] },
  { id: 'time-surge', name: 'Chrono Pulse', element: 'time', effectId: 'time-surge', effectName: 'Élan temporel', effectText: 'Choisissez une rune de votre main et invoquez-la immédiatement sans consommer votre invocation normale.', rulingText: 'Choisissez assaut révélé ou défense voilée lors de la résolution. Cette invocation reste possible après l’invocation normale du tour.', timing: 'main', color: 0xb6b3a2, strengths: ['telekinesis', 'cosmic'] },
  { id: 'space-time-rift', name: 'Rift Chamber', element: 'space-time', effectId: 'rift-dance', effectName: 'Danse de faille', effectText: 'Piochez 1 rune et ouvrez une faille pour votre prochain tour.', rulingText: 'Au début de votre prochain tour, une faille est consommée pour accorder 1 invocation supplémentaire. Les failles excédentaires restent en réserve.', timing: 'main', color: 0x4a9adb, strengths: ['time', 'air'] },
  { id: 'creation-seed', name: 'Genesis Loom', element: 'creation', effectId: 'genesis-spark', effectName: 'Étincelle de genèse', effectText: 'Crée une rune aléatoire dans votre main.', rulingText: 'La création n’est pas une pioche. Elle peut dépasser la limite de main sans défausse immédiate.', timing: 'main', color: 0x8755f5, strengths: ['unknown', 'darkness'] },
  { id: 'storm-fracture', name: 'Tempest Fracture', element: 'storm', effectId: 'tempest-break', effectName: 'Fracture de tempête', effectText: 'Une rune alliée attaque immédiatement.', rulingText: 'Cet assaut suit toutes les règles normales : cible obligatoire, avantage élémentaire, bouclier, dégâts et destruction de l’attaquant compris.', timing: 'main', color: 0x4dd8ff, strengths: ['water', 'air'] }
]

export const standardRunes: RuneDefinition[] = baseRuneCatalog.map((rune) => ({
  ...rune,
  baseRuneId: rune.id,
  variant: 'standard',
}))

const alterCatalog: Record<string, Pick<RuneDefinition, 'effectId' | 'effectName' | 'effectText' | 'rulingText' | 'timing'>> = {
  'fire-ember': { effectId: 'ember-collapse', effectName: 'Effondrement de braise', effectText: 'Sacrifiez cette rune pour détruire une rune adverse ciblée.', rulingText: 'Le sacrifice et la destruction ont lieu pendant la résolution. Si la cible a quitté le terrain, la rune n’est pas sacrifiée.', timing: 'main' },
  'water-current': { effectId: 'tidal-drain', effectName: 'Drain de marée', effectText: 'Volez 1 PV à l’adversaire.', rulingText: 'L’adversaire perd 1 PV, puis vous récupérez 1 PV sans dépasser votre maximum.', timing: 'main' },
  'nature-root': { effectId: 'root-usurpation', effectName: 'Usurpation végétale', effectText: 'Détruisez une rune adverse ciblée, puis cédez cette rune neutralisée à l’adversaire.', rulingText: 'La rune Nature change de camp après la destruction et ne peut plus activer son pouvoir.', timing: 'main' },
  'earth-bulwark': { effectId: 'stone-sanctuary', effectName: 'Sanctuaire lithique', effectText: 'En réponse, annulez un effet qui cible une rune alliée.', rulingText: 'Cet Alter ne s’active que dans une fenêtre de réponse lorsque l’une de vos runes est ciblée.', timing: 'response' },
  'air-gale': { effectId: 'gale-suspension', effectName: 'Suspension du vent', effectText: 'L’adversaire saute sa prochaine pioche.', rulingText: 'La prochaine pioche normale de l’adversaire est ignorée. Les pioches accordées par des effets restent possibles.', timing: 'main' },
  'telekinesis-orbit': { effectId: 'orbit-distortion', effectName: 'Distorsion orbitale', effectText: 'Replacez une rune aléatoire de la main adverse au fond de son grimoire.', rulingText: 'La rune est choisie par le moteur et rejoint la fin de l’ordre de pioche adverse.', timing: 'main' },
  'darkness-veil': { effectId: 'veil-banishment', effectName: 'Bannissement du voile', effectText: 'Bannissez une rune adverse révélée ciblée.', rulingText: 'Une rune voilée ne peut pas être choisie. Le bannissement n’est pas une destruction.', timing: 'main' },
  'light-reveal': { effectId: 'solar-restoration', effectName: 'Restauration solaire', effectText: 'Ramenez une rune bannie sur votre terrain en défense révélée.', rulingText: 'La rune revient neutralisée pour ce tour et ne peut pas attaquer immédiatement.', timing: 'main' },
  'ice-lock': { effectId: 'frost-negation', effectName: 'Négation cryique', effectText: 'En réponse, annulez le dernier pouvoir adverse activé.', rulingText: 'Cet Alter est une réponse rapide et ne s’active pas librement pendant la phase principale.', timing: 'response' },
  'cosmic-return': { effectId: 'astral-gate', effectName: 'Porte astrale', effectText: 'Sacrifiez cette rune pour invoquer une rune de votre cimetière.', rulingText: 'Choisissez sa posture lors de la résolution. Cette invocation ne consomme pas votre invocation normale.', timing: 'main' },
  'time-surge': { effectId: 'chrono-repeat', effectName: 'Reprise chrono', effectText: 'Sacrifiez cette rune pour rendre son pouvoir à une rune alliée.', rulingText: 'La cible peut de nouveau activer son pouvoir. Chrono Pulse rejoint ensuite le cimetière.', timing: 'main' },
  'space-time-rift': { effectId: 'rift-overwrite', effectName: 'Écrasement de faille', effectText: 'Replacez une rune adverse ciblée au fond de son grimoire et gagnez 1 faille.', rulingText: 'Le renvoi n’est pas une destruction. La faille accordera une invocation supplémentaire lors d’un prochain tour.', timing: 'main' },
  'creation-seed': { effectId: 'genesis-overflow', effectName: 'Débordement de genèse', effectText: 'Créez 2 runes aléatoires dans votre main, puis perdez 1 PV.', rulingText: 'La création peut dépasser la limite de main. La perte de PV fait partie de la résolution.', timing: 'main' },
  'electricity-lash': { effectId: 'tempest-overdrive', effectName: 'Surcharge de tempête', effectText: 'Rendez son assaut à une rune alliée, puis perdez 1 PV.', rulingText: 'La cible peut attaquer de nouveau ce tour si elle est en assaut et n’est pas neutralisée.', timing: 'main' },
  'storm-fracture': { effectId: 'tempest-overdrive', effectName: 'Surcharge de tempête', effectText: 'Rendez son assaut à une rune alliée, puis perdez 1 PV.', rulingText: 'La cible peut attaquer de nouveau ce tour si elle est en assaut et n’est pas neutralisée.', timing: 'main' },
}

export const alterRunes: RuneDefinition[] = standardRunes.map((rune) => ({
  ...rune,
  ...alterCatalog[rune.id],
  id: `${rune.id}-alter`,
  baseRuneId: rune.id,
  variant: 'alter',
}))

export const runes: RuneDefinition[] = [...standardRunes, ...alterRunes]

export const runeById = Object.fromEntries(runes.map((rune) => [rune.id, rune])) as Record<string, RuneDefinition>

export const starterDeck = [
  'fire-ember', 'water-current', 'nature-root', 'earth-bulwark',
  'air-gale', 'telekinesis-orbit', 'darkness-veil', 'light-reveal',
  'ice-lock', 'cosmic-return', 'time-surge', 'space-time-rift',
  'creation-seed', 'electricity-lash', 'storm-fracture',
]


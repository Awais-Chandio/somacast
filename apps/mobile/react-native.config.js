// Brand fonts live in the repo-root assets folder (shared with apps/web later).
// Only the .ttf files are listed, so the licence and README are not copied into the app.
// After changing this list, run `npx react-native-asset` to copy them into android/ and ios/.
const FONTS = [
  'FiraSans-Black',
  'FiraSans-Bold',
  'Overpass-Regular',
  'Overpass-SemiBold',
  'Overpass-Bold',
  'Overpass-Italic',
  'FiraCode-Regular',
  'FiraCode-Bold',
];

module.exports = {
  assets: FONTS.map(name => `../../assets/fonts/${name}.ttf`),
};

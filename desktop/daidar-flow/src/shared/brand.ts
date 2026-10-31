export const brandLinks = Object.freeze({
  website: "https://daidarsoluations.com/",
  facebook: "https://www.facebook.com/daidarsoluations/",
});
export type BrandLink = keyof typeof brandLinks;
export function approvedBrandUrl(id: unknown): string | null {
  return typeof id === "string" && Object.hasOwn(brandLinks, id)
    ? brandLinks[id as BrandLink]
    : null;
}

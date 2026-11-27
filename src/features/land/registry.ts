/**
 * The land-area conversion registry: the ONE place that holds conversion
 * factors. Square feet is the canonical base: every unit is defined by its
 * area in square feet (or, for the SI units, derived from it).
 *
 * All factors are decimal STRINGS, never JavaScript numbers, so they can be
 * turned into exact `Decimal` values.
 *
 * Approved baseline: `docs/notion/V1_FUNCTIONAL_REQUIREMENTS.md` section 4.4
 * ("Verified V1 conversion baseline") lists these exact square-foot factors as
 * the implementation source of truth, supported by these Government of Nepal
 * references (cited from the spec; the PDFs were NOT independently opened or
 * verified while implementing Issues #73/#74):
 * - Department of Urban Development and Building Construction, Government of
 *   Nepal, "Resource Book on Building Bylaws and Building Permit System":
 *   https://plgsp.gov.np/sites/default/files/2023-09/Resource_Book_on_Building_Bylaws%20and%20Building%20Permit%20System%20in_Nepal.pdf
 * - Government of Nepal technical educational material, "Practice Unit of
 *   Length / Unit of Land":
 *   https://giwmscdnone.gov.np/media/pdf_upload/Compress-Combine-1.%20Computer%20and%20Drawing%20Grade%209_yoxzmi3.pdf
 * - Department of Land Management and Archive, "land measurement information":
 *   https://www.dolma.gov.np/uploads/files/MLV%202079-080/%E0%A4%A8%E0%A5%8D%E0%A4%AF%E0%A5%82%E0%A4%A8%E0%A4%A4%E0%A5%8D%E0%A4%A4%E0%A4%AE%20%E0%A4%AE%E0%A5%82%E0%A4%B2%E0%A5%8D%E0%A4%AF%E0%A4%BE%E0%A4%95%E0%A4%A8%202080-81/%E0%A4%A7%E0%A4%A8%E0%A4%97%E0%A4%A7%E0%A5%80%20%E0%A4%95%E0%A5%88%E0%A4%B2%E0%A4%BE%E0%A4%B2%E0%A5%80.pdf
 *
 * Supplementary references (pages opened and checked 2026-11-27; they show
 * 1 Ropani = 5,476 sq ft, 1 Bigha = 72,900, 1 Kattha = 3,645, 1 Dhur = 182.25):
 * - Wikipedia, "Nepalese customary units of measurement" (Ropani = 16 Aana =
 *   64 Paisa = 256 Daam; Bigha = 20 Kattha; Kattha = 20 Dhur):
 *   https://en.wikipedia.org/wiki/Nepalese_customary_units_of_measurement
 * - Basobaas, "Nepal Land Unit Converter":
 *   https://basobaas.com/blog/nepal-land-unit-converter-ropani-aana-bigha-dhur
 * - Issue #74 (project owner): "1 sq ft = 0.09290304 sq m (exact)", "1 hectare
 *   = 10,000 sq m", "1 international acre = 4,046.8564224 sq m".
 *
 * Note: some web pages round a Ropani's subunits (for example an Aana to 342
 * sq ft, which would make 16 Aana = 5,472 sq ft). This registry does NOT do
 * that: Aana, Paisa and Daam are derived exactly from the Ropani (5,476 / 16,
 * / 4, / 4), so the hierarchy always adds up exactly.
 */

/** Square feet in one Bigha (20 Kattha = 400 Dhur): the Terai base factor. */
export const SQ_FT_PER_BIGHA = '72900';
/** Square feet in one hill Ropani (74 ft x 74 ft): the Hilly base factor. */
export const SQ_FT_PER_ROPANI = '5476';

/** Exact hierarchy of the compound units. */
export const KATTHA_PER_BIGHA = 20;
export const DHUR_PER_KATTHA = 20;
export const AANA_PER_ROPANI = 16;
export const PAISA_PER_AANA = 4;
export const DAAM_PER_PAISA = 4;

/** Exact SI / imperial factors (international foot and acre). */
export const SQ_M_PER_SQ_FT = '0.09290304';
export const SQ_M_PER_HECTARE = '10000';
export const SQ_M_PER_ACRE = '4046.8564224';

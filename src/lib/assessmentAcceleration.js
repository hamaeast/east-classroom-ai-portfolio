import { STANDARD_KEYS } from '@/lib/eastStandards';

const BANDS = ['K-2', '3-6', '7-8', '9-12'];

export function accelerationStatus(assessments, currentBand) {
  const currentIndex = BANDS.indexOf(currentBand);
  if (currentIndex === BANDS.length - 1) return [];
  const recent = assessments
    .filter(item => item.grade_band === currentBand)
    .sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at))
    .slice(0, 3);

  return STANDARD_KEYS.flatMap(standardKey => {
    const latest = recent[0]?.results?.find(result => result.standard_key === standardKey);
    const targetIndex = BANDS.indexOf(latest?.assessed_grade_band);
    if (targetIndex <= currentIndex) return [];
    const firstLower = recent.findIndex(assessment => {
      const result = assessment.results?.find(item => item.standard_key === standardKey);
      return BANDS.indexOf(result?.assessed_grade_band) < targetIndex;
    });
    const consecutive = firstLower === -1 ? recent.length : firstLower;
    return [{ standardKey, targetBand: BANDS[targetIndex], consecutive, eligible: consecutive === 3 }];
  });
}
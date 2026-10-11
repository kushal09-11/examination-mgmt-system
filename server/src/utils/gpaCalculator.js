/**
 * Utility functions for GPA & CGPA calculations based on institutional policy
 * Formula: GPA = Σ(Credits × Grade Points) / Σ(Credits)
 */

/**
 * Determine letter grade and grade points based on percentage and active grading policy
 * Default fallback follows standard university scale if DB policy is not passed.
 */
function determineGrade(percentage, gradingPolicies = []) {
  const pct = Number(percentage);

  if (gradingPolicies && gradingPolicies.length > 0) {
    // Sort descending by min_percentage
    const sorted = [...gradingPolicies].sort((a, b) => Number(b.min_percentage) - Number(a.min_percentage));
    for (const p of sorted) {
      if (pct >= Number(p.min_percentage) && pct <= Number(p.max_percentage)) {
        return {
          grade: p.grade,
          gradePoint: Number(p.grade_point),
          description: p.description,
        };
      }
    }
  }

  // Fallback scale
  if (pct >= 90.0) return { grade: 'O', gradePoint: 10.0, description: 'Outstanding' };
  if (pct >= 80.0) return { grade: 'A+', gradePoint: 9.0, description: 'Excellent' };
  if (pct >= 70.0) return { grade: 'A', gradePoint: 8.0, description: 'Very Good' };
  if (pct >= 60.0) return { grade: 'B+', gradePoint: 7.0, description: 'Good' };
  if (pct >= 55.0) return { grade: 'B', gradePoint: 6.0, description: 'Above Average' };
  if (pct >= 50.0) return { grade: 'C', gradePoint: 5.0, description: 'Average' };
  if (pct >= 40.0) return { grade: 'P', gradePoint: 4.0, description: 'Pass' };
  return { grade: 'F', gradePoint: 0.0, description: 'Fail' };
}

/**
 * Calculate GPA for a set of subject results
 * @param {Array<{ credits: number, gradePoint: number }>} subjectResults
 * @returns {number} GPA rounded to 2 decimal places
 */
function calculateGPA(subjectResults) {
  if (!subjectResults || subjectResults.length === 0) return 0.0;

  let totalCreditPoints = 0;
  let totalCredits = 0;

  for (const item of subjectResults) {
    const credits = Number(item.credits);
    const gradePoint = Number(item.gradePoint !== undefined ? item.gradePoint : item.grade_points);

    if (credits > 0) {
      totalCreditPoints += credits * gradePoint;
      totalCredits += credits;
    }
  }

  if (totalCredits === 0) return 0.0;

  const gpa = totalCreditPoints / totalCredits;
  return Math.round(gpa * 100) / 100;
}

/**
 * Calculate cumulative GPA (CGPA) across multiple semesters
 * Weighted by total credits completed across each semester
 * @param {Array<{ semester: number, gpa: number, credits: number }>} semesterList
 * @returns {number} CGPA rounded to 2 decimal places
 */
function calculateCGPA(semesterList) {
  if (!semesterList || semesterList.length === 0) return 0.0;

  let totalWeighted = 0;
  let totalCredits = 0;

  for (const sem of semesterList) {
    const credits = Number(sem.credits);
    const gpa = Number(sem.gpa);

    if (credits > 0) {
      totalWeighted += gpa * credits;
      totalCredits += credits;
    }
  }

  if (totalCredits === 0) return 0.0;

  const cgpa = totalWeighted / totalCredits;
  return Math.round(cgpa * 100) / 100;
}

module.exports = {
  determineGrade,
  calculateGPA,
  calculateCGPA,
};

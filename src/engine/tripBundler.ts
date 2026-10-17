import { CityTier, Expense, Trip } from '../types/expense';

export interface TripBundlingOptions {
  expenses: Expense[];
  cityTiers: Record<string, CityTier>;
  defaultOrgId?: string;
}

/**
 * Deterministically bundles expenses into Trips based on:
 * 1. Travel transit / lodging dates (air, train, hotel)
 * 2. Nearby same-city expenses within date clusters (gap <= 3 days)
 * Explicitly marks inferred context as inferred.
 */
export function bundleExpensesIntoTrips(options: TripBundlingOptions): Trip[] {
  const { expenses, cityTiers, defaultOrgId = 'org_demo' } = options;

  // Filter travel-related or explicit city expenses
  const travelExpenses = expenses.filter(
    (e) => e.context?.isTravel || e.context?.city || (e.extracted?.lineItems || []).some((li) => /flight|airline|rail|hotel|lodging|uber|cab|taxi/i.test(li.description))
  );

  // Group by employee
  const byEmployee: Record<string, Expense[]> = {};
  for (const exp of travelExpenses) {
    if (!byEmployee[exp.employeeId]) byEmployee[exp.employeeId] = [];
    byEmployee[exp.employeeId].push(exp);
  }

  const trips: Trip[] = [];

  for (const [empId, empExpenses] of Object.entries(byEmployee)) {
    // Sort chronologically
    const sorted = [...empExpenses].sort((a, b) => (a.expenseDate || '').localeCompare(b.expenseDate || ''));

    // Cluster by destination city and date proximity (max gap 3 days)
    let currentCluster: Expense[] = [];
    let currentCity: string = '';

    for (const exp of sorted) {
      const expCity = (exp.context?.city || 'Business Trip').trim();

      if (currentCluster.length === 0) {
        currentCluster.push(exp);
        currentCity = expCity;
      } else {
        const lastExp = currentCluster[currentCluster.length - 1];
        const lastDate = new Date(lastExp.expenseDate + 'T00:00:00Z').getTime();
        const thisDate = new Date(exp.expenseDate + 'T00:00:00Z').getTime();
        const daysDiff = (thisDate - lastDate) / (1000 * 60 * 60 * 24);

        if (daysDiff <= 3 && (currentCity === 'Business Trip' || expCity === 'Business Trip' || currentCity.toLowerCase() === expCity.toLowerCase())) {
          currentCluster.push(exp);
          if (currentCity === 'Business Trip' && expCity !== 'Business Trip') {
            currentCity = expCity;
          }
        } else {
          // Emit previous cluster as a trip
          trips.push(createTripFromCluster(empId, defaultOrgId, currentCity, currentCluster, cityTiers));
          currentCluster = [exp];
          currentCity = expCity;
        }
      }
    }

    if (currentCluster.length > 0) {
      trips.push(createTripFromCluster(empId, defaultOrgId, currentCity, currentCluster, cityTiers));
    }
  }

  return trips;
}

function createTripFromCluster(
  employeeId: string,
  orgId: string,
  city: string,
  cluster: Expense[],
  cityTiers: Record<string, CityTier>
): Trip {
  const startDate = cluster[0].expenseDate;
  const endDate = cluster[cluster.length - 1].expenseDate;
  const totalSpendMinor = cluster.reduce(
    (acc, e) => acc + (e.normalizedCurrency?.targetAmountMinor || 0),
    0
  );

  const matchedTier = cityTiers[city] || 'Tier-1';
  const tripId = `trip_${employeeId}_${startDate}_${city.toLowerCase().replace(/\s+/g, '_')}`;

  return {
    id: tripId,
    orgId,
    employeeId,
    name: `${city} Visit (${startDate})`,
    destinationCity: city,
    cityTier: matchedTier,
    startDate,
    endDate,
    status: 'completed',
    expenseIds: cluster.map((e) => e.id),
    totalSpendMinor,
    isInferred: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

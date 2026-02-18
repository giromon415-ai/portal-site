import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs, where, startAfter } from "firebase/firestore";
import { Match } from "@/types";

const calculateResult = (my: number, opp: number): 'win' | 'lose' | 'draw' => {
  if (my > opp) return 'win';
  if (my < opp) return 'lose';
  return 'draw';
};

// Used for Home Page (limit 50, robust sort)
export const getRecentMatches = async (limitCount: number = 50): Promise<Match[]> => {
  try {
    const q = query(
      collection(db, "matches"),
      orderBy("date", "desc"),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        const scoreMyself = Number(data.scoreMyself);
        const scoreOpponent = Number(data.scoreOpponent);
        const result = calculateResult(scoreMyself, scoreOpponent);
        return { id: doc.id, ...data, scoreMyself, scoreOpponent, result } as Match;
    });
  } catch (error) {
    console.error("Error fetching recent matches:", error);
    return [];
  }
};

// Modified to fetch ALL matches within constraints (limit 500) to allow client-side sorting
// This bypasses Firestore's lexicographical string sort issue (e.g. "2/8" > "2/15")
export const getMatches = async (
  limitCount: number = 500,
  lastDoc: any = null,
  period?: { start: string; end: string },
  opponent?: string
) => {
  try {
    // We intentionally do NOT use orderBy("date", "desc") here if it risks hiding data
    // But we need some order. Let's try fetching without specific order or just use ID?
    // Actually, to get ALL matches for client-side sort, we just need the filters.
    
    let constraints: any[] = []; // removed orderBy to avoid strict index requirements if possible, or just accept default

    if (period) {
      const start = period.start.replace(/-/g, '/');
      const end = period.end.replace(/-/g, '/');
      constraints.push(where("date", ">=", start));
      constraints.push(where("date", "<=", end));
    }

    if (opponent) {
      constraints.push(where("opponent", "==", opponent));
    }

    // High limit to fetch "all" effectively
    constraints.push(limit(limitCount));

    const q = query(collection(db, "matches"), ...constraints);
    const snapshot = await getDocs(q);
    
    const matches = snapshot.docs.map(doc => {
        const data = doc.data();
        const scoreMyself = Number(data.scoreMyself);
        const scoreOpponent = Number(data.scoreOpponent);
        const result = calculateResult(scoreMyself, scoreOpponent);
        return { id: doc.id, ...data, scoreMyself, scoreOpponent, result } as Match;
    });

    // We do NOT support server-side pagination (startAfter) in this mode
    // because the sort order is unreliable server-side.
    // We return null for lastVisible to indicate "no more server pages" (client handles pagination if needed)
    
    return { matches, lastVisible: null };
  } catch (error) {
    console.error("Error fetching matches:", error);
    return { matches: [], lastVisible: null };
  }
};

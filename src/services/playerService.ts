import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Player } from "@/types";

export const getPlayers = async (): Promise<Player[]> => {
  try {
    const q = query(collection(db, "players"), orderBy("number", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
  } catch (error) {
    console.error("Error fetching players:", error);
    return [];
  }
};

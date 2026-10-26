/** Minimum prototypes before a person can participate in a removal suggestion. */
export const MIN_PROTOTYPES = 3;

export type RosterStatus = "ready" | "incomplete";

export interface PrototypeStub {
  id: string;
  /**
   * Local demo pointer. Only `fixture://` is accepted.
   * Never an http(s) URL and never an uploaded original.
   */
  sampleRef: string;
  /** Deterministic stand-in for an on-device embedding. */
  embedding: number[];
}

export interface RosterPerson {
  id: string;
  displayName: string;
  aliases: string[];
  prototypes: PrototypeStub[];
  status: RosterStatus;
}

export interface FamilyRoster {
  people: RosterPerson[];
}

export interface NewRosterPerson {
  id: string;
  displayName: string;
  aliases?: string[];
  prototypes: PrototypeStub[];
}

export class RosterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RosterError";
  }
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function assertFixtureRef(sampleRef: string): void {
  if (!sampleRef.startsWith("fixture://") || sampleRef.includes("..")) {
    throw new RosterError("样例必须使用 fixture:// 本机指针，不能指向网络或路径跳转");
  }
}

function usablePrototype(prototype: PrototypeStub): boolean {
  assertFixtureRef(prototype.sampleRef);
  return prototype.id.length > 0 && prototype.embedding.length > 0;
}

export function createRoster(people: NewRosterPerson[]): FamilyRoster {
  return {
    people: people.map((person) => {
      const prototypes = person.prototypes.map((prototype) => {
        usablePrototype(prototype);
        return prototype;
      });
      const readyCount = prototypes.length;
      return {
        id: person.id,
        displayName: person.displayName,
        aliases: person.aliases ?? [],
        prototypes,
        status: readyCount >= MIN_PROTOTYPES ? "ready" : "incomplete",
      };
    }),
  };
}

export function findPerson(roster: FamilyRoster, name: string): RosterPerson | undefined {
  const key = normalizeName(name);
  for (const person of roster.people) {
    if (normalizeName(person.displayName) === key) return person;
    for (const alias of person.aliases) {
      if (normalizeName(alias) === key) return person;
    }
  }
  return undefined;
}

export function readyPeople(roster: FamilyRoster): RosterPerson[] {
  return roster.people.filter((person) => person.status === "ready");
}

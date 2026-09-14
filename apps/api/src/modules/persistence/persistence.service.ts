import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type {
  Assignment,
  BaggageRoute,
  Crew,
  Flight,
  Gate,
  ImpactEvent,
  OpsBoardState
} from "@c3/shared";
import type { EngineState, PersistenceAdapter, ResolutionPlan } from "@c3/core";
import { createDbClient } from "@c3/db";
import type { DbClient } from "@c3/db";
import { runMigrations } from "@c3/db";

@Injectable()
export class PersistenceService implements PersistenceAdapter, OnModuleInit {
  private readonly logger = new Logger(PersistenceService.name);
  private dbClient: DbClient | null = null;
  private memoryState: EngineState = {
    flights: [],
    gates: [],
    crews: [],
    baggageRoutes: [],
    assignments: [],
    recentImpactEvents: []
  };
  private committedTokens = new Set<string>();

  async onModuleInit() {
    this.seedInitialState();

    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        await runMigrations(dbUrl);
        this.dbClient = createDbClient(dbUrl);
        this.logger.log("Connected to PostgreSQL persistence layer");
      } catch (err) {
        this.logger.warn(
          `Could not connect to PostgreSQL (${err instanceof Error ? err.message : err}). Running in high-performance in-memory state mode.`
        );
        this.dbClient = null;
      }
    } else {
      this.logger.log("No DATABASE_URL provided. Initialized in-memory operational state store.");
    }
  }

  private seedInitialState(): void {
    const gates: Gate[] = [
      {
        id: "gate_A1",
        name: "Gate A1",
        terminal: "T1",
        compatibleAircraft: ["A320", "B737", "A321"],
        status: "available"
      },
      {
        id: "gate_A2",
        name: "Gate A2",
        terminal: "T1",
        compatibleAircraft: ["A320", "B737", "A321"],
        status: "available"
      },
      {
        id: "gate_A3",
        name: "Gate A3",
        terminal: "T1",
        compatibleAircraft: ["A350", "B777", "B787"],
        status: "available"
      },
      {
        id: "gate_A4",
        name: "Gate A4",
        terminal: "T1",
        compatibleAircraft: ["A320", "B737", "CRJ900", "A321"],
        status: "available"
      },
      {
        id: "gate_B1",
        name: "Gate B1",
        terminal: "T2",
        compatibleAircraft: ["A320", "B737", "A321"],
        status: "available"
      },
      {
        id: "gate_B2",
        name: "Gate B2",
        terminal: "T2",
        compatibleAircraft: ["A320", "B737"],
        status: "available"
      },
      {
        id: "gate_B3",
        name: "Gate B3",
        terminal: "T2",
        compatibleAircraft: ["A350", "B787", "B777"],
        status: "available"
      },
      {
        id: "gate_B4",
        name: "Gate B4",
        terminal: "T2",
        compatibleAircraft: ["CRJ900", "E190"],
        status: "available"
      },
      {
        id: "gate_C1",
        name: "Gate C1",
        terminal: "T3",
        compatibleAircraft: ["A380", "A350", "B777", "B787"],
        status: "available"
      },
      {
        id: "gate_C2",
        name: "Gate C2",
        terminal: "T3",
        compatibleAircraft: ["A320", "B737", "A321"],
        status: "available"
      },
      {
        id: "gate_C3",
        name: "Gate C3",
        terminal: "T3",
        compatibleAircraft: ["A320", "B737", "CRJ900", "E190"],
        status: "available"
      }
    ];

    const crews: Crew[] = [
      {
        id: "crew_alpha",
        name: "Alpha Crew (Capt. Miller)",
        qualifications: ["A320", "B737", "A321"],
        currentTerminal: "T1",
        status: "available"
      },
      {
        id: "crew_bravo",
        name: "Bravo Crew (Capt. Vance)",
        qualifications: ["A320", "B737", "A321"],
        currentTerminal: "T1",
        status: "available"
      },
      {
        id: "crew_charlie",
        name: "Charlie Crew (Capt. Zhang)",
        qualifications: ["A350", "B777", "B787"],
        currentTerminal: "T1",
        status: "available"
      },
      {
        id: "crew_delta",
        name: "Delta Crew (Capt. Gomez)",
        qualifications: ["A320", "B737", "CRJ900"],
        currentTerminal: "T2",
        status: "available"
      },
      {
        id: "crew_echo",
        name: "Echo Crew (Capt. Johansson)",
        qualifications: ["A320", "B737", "A321"],
        currentTerminal: "T2",
        status: "available"
      },
      {
        id: "crew_foxtrot",
        name: "Foxtrot Crew (Capt. Rossi)",
        qualifications: ["CRJ900", "E190"],
        currentTerminal: "T2",
        status: "available"
      },
      {
        id: "crew_golf",
        name: "Golf Crew (Capt. Tanaka)",
        qualifications: ["A380", "A350", "B777"],
        currentTerminal: "T3",
        status: "available"
      },
      {
        id: "crew_hotel",
        name: "Hotel Crew (Capt. O'Connor)",
        qualifications: ["A320", "A321", "B737"],
        currentTerminal: "T1",
        status: "available"
      },
      {
        id: "crew_india",
        name: "India Crew (Capt. Al-Mansoor)",
        qualifications: ["B787", "A350", "B777"],
        currentTerminal: "T2",
        status: "available"
      },
      {
        id: "crew_juliet",
        name: "Juliet Crew (Capt. Dupont)",
        qualifications: ["A320", "B737", "A321"],
        currentTerminal: "T3",
        status: "available"
      }
    ];

    const flights: Flight[] = [
      {
        id: "fl_101",
        flightNumber: "AA101",
        aircraftType: "A320",
        scheduledArrival: new Date("2026-09-15T10:00:00.000Z"),
        estimatedArrival: new Date("2026-09-15T10:00:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T12:00:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T12:00:00.000Z"),
        status: "scheduled",
        gateId: "gate_A1",
        crewId: "crew_alpha"
      },
      {
        id: "fl_202",
        flightNumber: "UA202",
        aircraftType: "A320",
        scheduledArrival: new Date("2026-09-15T12:30:00.000Z"),
        estimatedArrival: new Date("2026-09-15T12:30:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T14:30:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T14:30:00.000Z"),
        status: "scheduled",
        gateId: "gate_A1",
        crewId: "crew_bravo"
      },
      {
        id: "fl_303",
        flightNumber: "DL303",
        aircraftType: "A320",
        scheduledArrival: new Date("2026-09-15T11:00:00.000Z"),
        estimatedArrival: new Date("2026-09-15T11:00:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T13:00:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T13:00:00.000Z"),
        status: "scheduled",
        gateId: "gate_A2",
        crewId: "crew_hotel"
      },
      {
        id: "fl_404",
        flightNumber: "BA404",
        aircraftType: "A350",
        scheduledArrival: new Date("2026-09-15T10:30:00.000Z"),
        estimatedArrival: new Date("2026-09-15T10:30:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T13:30:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T13:30:00.000Z"),
        status: "scheduled",
        gateId: "gate_A3",
        crewId: "crew_charlie"
      },
      {
        id: "fl_505",
        flightNumber: "SW505",
        aircraftType: "B737",
        scheduledArrival: new Date("2026-09-15T11:30:00.000Z"),
        estimatedArrival: new Date("2026-09-15T11:30:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T13:30:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T13:30:00.000Z"),
        status: "scheduled",
        gateId: "gate_B1",
        crewId: "crew_delta"
      },
      {
        id: "fl_606",
        flightNumber: "EK606",
        aircraftType: "A380",
        scheduledArrival: new Date("2026-09-15T11:00:00.000Z"),
        estimatedArrival: new Date("2026-09-15T11:00:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T14:00:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T14:00:00.000Z"),
        status: "scheduled",
        gateId: "gate_C1",
        crewId: "crew_golf"
      },
      {
        id: "fl_707",
        flightNumber: "AF707",
        aircraftType: "A321",
        scheduledArrival: new Date("2026-09-15T13:30:00.000Z"),
        estimatedArrival: new Date("2026-09-15T13:30:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T15:30:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T15:30:00.000Z"),
        status: "scheduled",
        gateId: "gate_A2",
        crewId: "crew_hotel"
      },
      {
        id: "fl_808",
        flightNumber: "LH808",
        aircraftType: "B787",
        scheduledArrival: new Date("2026-09-15T12:00:00.000Z"),
        estimatedArrival: new Date("2026-09-15T12:00:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T14:30:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T14:30:00.000Z"),
        status: "scheduled",
        gateId: "gate_B3",
        crewId: "crew_india"
      },
      {
        id: "fl_909",
        flightNumber: "QR909",
        aircraftType: "B777",
        scheduledArrival: new Date("2026-09-15T14:00:00.000Z"),
        estimatedArrival: new Date("2026-09-15T14:00:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T17:00:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T17:00:00.000Z"),
        status: "scheduled",
        gateId: "gate_A3",
        crewId: "crew_charlie"
      },
      {
        id: "fl_1001",
        flightNumber: "SQ1001",
        aircraftType: "A350",
        scheduledArrival: new Date("2026-09-15T14:30:00.000Z"),
        estimatedArrival: new Date("2026-09-15T14:30:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T17:30:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T17:30:00.000Z"),
        status: "scheduled",
        gateId: "gate_C1",
        crewId: "crew_golf"
      },
      {
        id: "fl_1102",
        flightNumber: "JL1102",
        aircraftType: "B737",
        scheduledArrival: new Date("2026-09-15T10:00:00.000Z"),
        estimatedArrival: new Date("2026-09-15T10:00:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T12:00:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T12:00:00.000Z"),
        status: "scheduled",
        gateId: "gate_B2",
        crewId: "crew_echo"
      },
      {
        id: "fl_1203",
        flightNumber: "KL1203",
        aircraftType: "E190",
        scheduledArrival: new Date("2026-09-15T10:45:00.000Z"),
        estimatedArrival: new Date("2026-09-15T10:45:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T12:45:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T12:45:00.000Z"),
        status: "scheduled",
        gateId: "gate_B4",
        crewId: "crew_foxtrot"
      },
      {
        id: "fl_1304",
        flightNumber: "VS1304",
        aircraftType: "A321",
        scheduledArrival: new Date("2026-09-15T14:00:00.000Z"),
        estimatedArrival: new Date("2026-09-15T14:00:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T16:00:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T16:00:00.000Z"),
        status: "scheduled",
        gateId: "gate_B1",
        crewId: "crew_echo"
      },
      {
        id: "fl_1405",
        flightNumber: "AC1405",
        aircraftType: "A320",
        scheduledArrival: new Date("2026-09-15T11:30:00.000Z"),
        estimatedArrival: new Date("2026-09-15T11:30:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T13:45:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T13:45:00.000Z"),
        status: "scheduled",
        gateId: "gate_C2",
        crewId: "crew_juliet"
      },
      {
        id: "fl_1506",
        flightNumber: "IB1506",
        aircraftType: "A320",
        scheduledArrival: new Date("2026-09-15T14:15:00.000Z"),
        estimatedArrival: new Date("2026-09-15T14:15:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T16:30:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T16:30:00.000Z"),
        status: "scheduled",
        gateId: "gate_C2",
        crewId: "crew_juliet"
      },
      {
        id: "fl_1607",
        flightNumber: "AY1607",
        aircraftType: "CRJ900",
        scheduledArrival: new Date("2026-09-15T13:15:00.000Z"),
        estimatedArrival: new Date("2026-09-15T13:15:00.000Z"),
        scheduledDeparture: new Date("2026-09-15T15:15:00.000Z"),
        estimatedDeparture: new Date("2026-09-15T15:15:00.000Z"),
        status: "scheduled",
        gateId: "gate_B4",
        crewId: "crew_foxtrot"
      }
    ];

    const assignments: Assignment[] = [
      // fl_101
      {
        id: "as_101_g",
        flightId: "fl_101",
        resourceId: "gate_A1",
        resourceType: "gate",
        startTime: new Date("2026-09-15T10:00:00.000Z"),
        endTime: new Date("2026-09-15T12:00:00.000Z")
      },
      {
        id: "as_101_c",
        flightId: "fl_101",
        resourceId: "crew_alpha",
        resourceType: "crew",
        startTime: new Date("2026-09-15T10:00:00.000Z"),
        endTime: new Date("2026-09-15T12:00:00.000Z")
      },

      // fl_202
      {
        id: "as_202_g",
        flightId: "fl_202",
        resourceId: "gate_A1",
        resourceType: "gate",
        startTime: new Date("2026-09-15T12:30:00.000Z"),
        endTime: new Date("2026-09-15T14:30:00.000Z")
      },
      {
        id: "as_202_c",
        flightId: "fl_202",
        resourceId: "crew_bravo",
        resourceType: "crew",
        startTime: new Date("2026-09-15T12:30:00.000Z"),
        endTime: new Date("2026-09-15T14:30:00.000Z")
      },

      // fl_303
      {
        id: "as_303_g",
        flightId: "fl_303",
        resourceId: "gate_A2",
        resourceType: "gate",
        startTime: new Date("2026-09-15T11:00:00.000Z"),
        endTime: new Date("2026-09-15T13:00:00.000Z")
      },
      {
        id: "as_303_c",
        flightId: "fl_303",
        resourceId: "crew_hotel",
        resourceType: "crew",
        startTime: new Date("2026-09-15T11:00:00.000Z"),
        endTime: new Date("2026-09-15T13:00:00.000Z")
      },

      // fl_404
      {
        id: "as_404_g",
        flightId: "fl_404",
        resourceId: "gate_A3",
        resourceType: "gate",
        startTime: new Date("2026-09-15T10:30:00.000Z"),
        endTime: new Date("2026-09-15T13:30:00.000Z")
      },
      {
        id: "as_404_c",
        flightId: "fl_404",
        resourceId: "crew_charlie",
        resourceType: "crew",
        startTime: new Date("2026-09-15T10:30:00.000Z"),
        endTime: new Date("2026-09-15T13:30:00.000Z")
      },

      // fl_505
      {
        id: "as_505_g",
        flightId: "fl_505",
        resourceId: "gate_B1",
        resourceType: "gate",
        startTime: new Date("2026-09-15T11:30:00.000Z"),
        endTime: new Date("2026-09-15T13:30:00.000Z")
      },
      {
        id: "as_505_c",
        flightId: "fl_505",
        resourceId: "crew_delta",
        resourceType: "crew",
        startTime: new Date("2026-09-15T11:30:00.000Z"),
        endTime: new Date("2026-09-15T13:30:00.000Z")
      },

      // fl_606
      {
        id: "as_606_g",
        flightId: "fl_606",
        resourceId: "gate_C1",
        resourceType: "gate",
        startTime: new Date("2026-09-15T11:00:00.000Z"),
        endTime: new Date("2026-09-15T14:00:00.000Z")
      },
      {
        id: "as_606_c",
        flightId: "fl_606",
        resourceId: "crew_golf",
        resourceType: "crew",
        startTime: new Date("2026-09-15T11:00:00.000Z"),
        endTime: new Date("2026-09-15T14:00:00.000Z")
      },

      // fl_707
      {
        id: "as_707_g",
        flightId: "fl_707",
        resourceId: "gate_A2",
        resourceType: "gate",
        startTime: new Date("2026-09-15T13:30:00.000Z"),
        endTime: new Date("2026-09-15T15:30:00.000Z")
      },
      {
        id: "as_707_c",
        flightId: "fl_707",
        resourceId: "crew_hotel",
        resourceType: "crew",
        startTime: new Date("2026-09-15T13:30:00.000Z"),
        endTime: new Date("2026-09-15T15:30:00.000Z")
      },

      // fl_808
      {
        id: "as_808_g",
        flightId: "fl_808",
        resourceId: "gate_B3",
        resourceType: "gate",
        startTime: new Date("2026-09-15T12:00:00.000Z"),
        endTime: new Date("2026-09-15T14:30:00.000Z")
      },
      {
        id: "as_808_c",
        flightId: "fl_808",
        resourceId: "crew_india",
        resourceType: "crew",
        startTime: new Date("2026-09-15T12:00:00.000Z"),
        endTime: new Date("2026-09-15T14:30:00.000Z")
      },

      // fl_909
      {
        id: "as_909_g",
        flightId: "fl_909",
        resourceId: "gate_A3",
        resourceType: "gate",
        startTime: new Date("2026-09-15T14:00:00.000Z"),
        endTime: new Date("2026-09-15T17:00:00.000Z")
      },
      {
        id: "as_909_c",
        flightId: "fl_909",
        resourceId: "crew_charlie",
        resourceType: "crew",
        startTime: new Date("2026-09-15T14:00:00.000Z"),
        endTime: new Date("2026-09-15T17:00:00.000Z")
      },

      // fl_1001
      {
        id: "as_1001_g",
        flightId: "fl_1001",
        resourceId: "gate_C1",
        resourceType: "gate",
        startTime: new Date("2026-09-15T14:30:00.000Z"),
        endTime: new Date("2026-09-15T17:30:00.000Z")
      },
      {
        id: "as_1001_c",
        flightId: "fl_1001",
        resourceId: "crew_golf",
        resourceType: "crew",
        startTime: new Date("2026-09-15T14:30:00.000Z"),
        endTime: new Date("2026-09-15T17:30:00.000Z")
      },

      // fl_1102
      {
        id: "as_1102_g",
        flightId: "fl_1102",
        resourceId: "gate_B2",
        resourceType: "gate",
        startTime: new Date("2026-09-15T10:00:00.000Z"),
        endTime: new Date("2026-09-15T12:00:00.000Z")
      },
      {
        id: "as_1102_c",
        flightId: "fl_1102",
        resourceId: "crew_echo",
        resourceType: "crew",
        startTime: new Date("2026-09-15T10:00:00.000Z"),
        endTime: new Date("2026-09-15T12:00:00.000Z")
      },

      // fl_1203
      {
        id: "as_1203_g",
        flightId: "fl_1203",
        resourceId: "gate_B4",
        resourceType: "gate",
        startTime: new Date("2026-09-15T10:45:00.000Z"),
        endTime: new Date("2026-09-15T12:45:00.000Z")
      },
      {
        id: "as_1203_c",
        flightId: "fl_1203",
        resourceId: "crew_foxtrot",
        resourceType: "crew",
        startTime: new Date("2026-09-15T10:45:00.000Z"),
        endTime: new Date("2026-09-15T12:45:00.000Z")
      },

      // fl_1304
      {
        id: "as_1304_g",
        flightId: "fl_1304",
        resourceId: "gate_B1",
        resourceType: "gate",
        startTime: new Date("2026-09-15T14:00:00.000Z"),
        endTime: new Date("2026-09-15T16:00:00.000Z")
      },
      {
        id: "as_1304_c",
        flightId: "fl_1304",
        resourceId: "crew_echo",
        resourceType: "crew",
        startTime: new Date("2026-09-15T14:00:00.000Z"),
        endTime: new Date("2026-09-15T16:00:00.000Z")
      },

      // fl_1405
      {
        id: "as_1405_g",
        flightId: "fl_1405",
        resourceId: "gate_C2",
        resourceType: "gate",
        startTime: new Date("2026-09-15T11:30:00.000Z"),
        endTime: new Date("2026-09-15T13:45:00.000Z")
      },
      {
        id: "as_1405_c",
        flightId: "fl_1405",
        resourceId: "crew_juliet",
        resourceType: "crew",
        startTime: new Date("2026-09-15T11:30:00.000Z"),
        endTime: new Date("2026-09-15T13:45:00.000Z")
      },

      // fl_1506
      {
        id: "as_1506_g",
        flightId: "fl_1506",
        resourceId: "gate_C2",
        resourceType: "gate",
        startTime: new Date("2026-09-15T14:15:00.000Z"),
        endTime: new Date("2026-09-15T16:30:00.000Z")
      },
      {
        id: "as_1506_c",
        flightId: "fl_1506",
        resourceId: "crew_juliet",
        resourceType: "crew",
        startTime: new Date("2026-09-15T14:15:00.000Z"),
        endTime: new Date("2026-09-15T16:30:00.000Z")
      },

      // fl_1607
      {
        id: "as_1607_g",
        flightId: "fl_1607",
        resourceId: "gate_B4",
        resourceType: "gate",
        startTime: new Date("2026-09-15T13:15:00.000Z"),
        endTime: new Date("2026-09-15T15:15:00.000Z")
      },
      {
        id: "as_1607_c",
        flightId: "fl_1607",
        resourceId: "crew_foxtrot",
        resourceType: "crew",
        startTime: new Date("2026-09-15T13:15:00.000Z"),
        endTime: new Date("2026-09-15T15:15:00.000Z")
      }
    ];

    const baggageRoutes: BaggageRoute[] = [
      {
        id: "bag_101",
        flightId: "fl_101",
        sourceGateId: "gate_A1",
        destinationCarousel: "Carousel 1",
        status: "routed"
      },
      {
        id: "bag_202",
        flightId: "fl_202",
        sourceGateId: "gate_A1",
        destinationCarousel: "Carousel 2",
        status: "routed"
      },
      {
        id: "bag_303",
        flightId: "fl_303",
        sourceGateId: "gate_A2",
        destinationCarousel: "Carousel 1",
        status: "routed"
      },
      {
        id: "bag_404",
        flightId: "fl_404",
        sourceGateId: "gate_A3",
        destinationCarousel: "Carousel 3",
        status: "routed"
      },
      {
        id: "bag_505",
        flightId: "fl_505",
        sourceGateId: "gate_B1",
        destinationCarousel: "Carousel 4",
        status: "routed"
      },
      {
        id: "bag_606",
        flightId: "fl_606",
        sourceGateId: "gate_C1",
        destinationCarousel: "Carousel 5",
        status: "routed"
      },
      {
        id: "bag_707",
        flightId: "fl_707",
        sourceGateId: "gate_A2",
        destinationCarousel: "Carousel 1",
        status: "routed"
      },
      {
        id: "bag_808",
        flightId: "fl_808",
        sourceGateId: "gate_B3",
        destinationCarousel: "Carousel 4",
        status: "routed"
      },
      {
        id: "bag_909",
        flightId: "fl_909",
        sourceGateId: "gate_A3",
        destinationCarousel: "Carousel 3",
        status: "routed"
      },
      {
        id: "bag_1001",
        flightId: "fl_1001",
        sourceGateId: "gate_C1",
        destinationCarousel: "Carousel 5",
        status: "routed"
      },
      {
        id: "bag_1102",
        flightId: "fl_1102",
        sourceGateId: "gate_B2",
        destinationCarousel: "Carousel 2",
        status: "routed"
      },
      {
        id: "bag_1203",
        flightId: "fl_1203",
        sourceGateId: "gate_B4",
        destinationCarousel: "Carousel 6",
        status: "routed"
      },
      {
        id: "bag_1304",
        flightId: "fl_1304",
        sourceGateId: "gate_B1",
        destinationCarousel: "Carousel 4",
        status: "routed"
      },
      {
        id: "bag_1405",
        flightId: "fl_1405",
        sourceGateId: "gate_C2",
        destinationCarousel: "Carousel 6",
        status: "routed"
      },
      {
        id: "bag_1506",
        flightId: "fl_1506",
        sourceGateId: "gate_C2",
        destinationCarousel: "Carousel 6",
        status: "routed"
      },
      {
        id: "bag_1607",
        flightId: "fl_1607",
        sourceGateId: "gate_B4",
        destinationCarousel: "Carousel 2",
        status: "routed"
      }
    ];

    this.memoryState = {
      flights,
      gates,
      crews,
      baggageRoutes,
      assignments,
      recentImpactEvents: []
    };
  }

  public async getState(): Promise<EngineState> {
    return {
      flights: this.memoryState.flights.map((f) => ({ ...f })),
      gates: this.memoryState.gates.map((g) => ({ ...g })),
      crews: this.memoryState.crews.map((c) => ({ ...c })),
      baggageRoutes: this.memoryState.baggageRoutes.map((b) => ({ ...b })),
      assignments: this.memoryState.assignments.map((a) => ({ ...a })),
      recentImpactEvents: (this.memoryState.recentImpactEvents || []).map((e) => ({
        ...e
      }))
    };
  }

  public async getBoardState(): Promise<OpsBoardState> {
    const s = await this.getState();
    return {
      flights: s.flights,
      gates: s.gates,
      crews: s.crews,
      baggageRoutes: s.baggageRoutes,
      assignments: s.assignments,
      recentImpactEvents: s.recentImpactEvents || [],
      lastUpdated: new Date()
    };
  }

  /**
   * Commits an allocation plan idempotently.
   */
  public async commitPlan(
    plan: ResolutionPlan
  ): Promise<{ success: boolean; committedAt: Date }> {
    // Idempotency check
    if (this.committedTokens.has(plan.changeSetToken)) {
      this.logger.log(`ChangeSet token ${plan.changeSetToken} already committed (idempotent no-op)`);
      return { success: true, committedAt: new Date() };
    }

    // Apply updates to memory state
    this.memoryState.assignments = plan.updatedAssignments.map((a) => ({ ...a }));
    this.memoryState.flights = plan.updatedFlights.map((f) => ({ ...f }));
    this.memoryState.baggageRoutes = plan.updatedBaggageRoutes.map((b) => ({ ...b }));

    const updatedEvents = [
      ...plan.impactEvents,
      ...(this.memoryState.recentImpactEvents || [])
    ].slice(0, 100);
    this.memoryState.recentImpactEvents = updatedEvents;

    this.committedTokens.add(plan.changeSetToken);

    return { success: true, committedAt: new Date() };
  }

  public isCommitted(token: string): boolean {
    return this.committedTokens.has(token);
  }

  public async getImpactHistory(): Promise<ImpactEvent[]> {
    return this.memoryState.recentImpactEvents || [];
  }
}

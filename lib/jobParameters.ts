// Mirrors FMS's lib/pricing.ts JobParameters exactly - this is the shape work_orders.survey_estimate
// expects, and the two apps are separate deployments/repos so there's no shared package to import
// it from. Keep in sync by hand if FMS's JobParameters changes.

export type BuildingSize = "Small" | "Large";
export type YesNo = "Yes" | "No";
export type TrenchDistance = "≤ 5m" | "≤ 15m" | "≤ 30m" | "≤ 60m" | "None";
export type ConduitRoutingType = "New conduit" | "Existing routing";
export type SpaceType = "Private" | "Public";
export type IndoorRoutingDistance = "≤ 10m" | "≤ 25m" | "≤ 40m";
export type BlowingType = "New BEP" | "Replacement";
export type LastDropRouting = "≤ 40m" | "> 40m";
export type SurfaceType = "Pavement" | "Asphalt" | "Concrete";

export type JobParameters = {
  buildingSize?: BuildingSize;
  floors?: number;
  elevatorRouting?: YesNo;
  trenchDistance?: TrenchDistance;
  conduitRoutingType?: ConduitRoutingType;
  spaceType?: SpaceType;
  indoorRoutingDistance?: IndoorRoutingDistance;
  blowingType?: BlowingType;
  aerialRouting?: YesNo;
  lastDropRouting?: LastDropRouting;
  surfaceType?: SurfaceType;
};

export const JOB_PARAMETER_KEYS: Array<keyof JobParameters> = [
  "buildingSize", "floors", "elevatorRouting", "trenchDistance", "conduitRoutingType",
  "spaceType", "indoorRoutingDistance", "blowingType", "aerialRouting", "lastDropRouting", "surfaceType",
];

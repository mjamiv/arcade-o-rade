export interface VehicleSpec {
  id: string;
  name: string;
  subtitle: string;
  kind: 'gt' | 'rally' | 'truck';
  description: string;
  color: number;
  mass: number;
  torque: number;
  power: number;
  wheelbase: number;
  track: number;
  length: number;
  width: number;
  radius: number;
  suspension: number;
  stiffness: number;
  damping: number;
  grip: number;
  drive: 'RWD' | 'AWD' | '4WD';
  drag: number;
  downforce: number;
  steering: number;
  redline: number;
  finalDrive: number;
  gears: number[];
  brake: number;
}
export const VEHICLES: VehicleSpec[] = [
  {
    id: 'vantage',
    name: 'VANTAGE GT',
    subtitle: 'Precision, unleashed.',
    kind: 'gt',
    description:
      'Low, light, rear-wheel driven. Reward smooth inputs with a perfectly balanced corner.',
    color: 0xef5b25,
    mass: 1280,
    torque: 330,
    power: 310,
    wheelbase: 2.66,
    track: 1.6,
    length: 4.42,
    width: 1.87,
    radius: 0.34,
    suspension: 0.3,
    stiffness: 38,
    damping: 4.8,
    grip: 2.5,
    drive: 'RWD',
    drag: 0.39,
    downforce: 1.1,
    steering: 0.47,
    redline: 7800,
    finalDrive: 3.7,
    gears: [3.1, 2.1, 1.55, 1.2, 0.95, 0.79],
    brake: 70,
  },
  {
    id: 'rally',
    name: 'RALLY RS',
    subtitle: 'Grip. Go. Repeat.',
    kind: 'rally',
    description:
      'Turbo power and all-wheel traction. Confidence on the circuit, composure on the grass.',
    color: 0x4a87dc,
    mass: 1420,
    torque: 390,
    power: 295,
    wheelbase: 2.54,
    track: 1.57,
    length: 4.05,
    width: 1.83,
    radius: 0.35,
    suspension: 0.36,
    stiffness: 31,
    damping: 4.4,
    grip: 2.8,
    drive: 'AWD',
    drag: 0.49,
    downforce: 0.7,
    steering: 0.5,
    redline: 6900,
    finalDrive: 3.9,
    gears: [3.0, 2.0, 1.5, 1.18, 0.94, 0.76],
    brake: 80,
  },
  {
    id: 'summit',
    name: 'SUMMIT X',
    subtitle: 'Take the long way.',
    kind: 'truck',
    description:
      'Big torque, long-travel suspension, and real heft. Brake early and feel the weight transfer.',
    color: 0xc3c7b3,
    mass: 2320,
    torque: 530,
    power: 340,
    wheelbase: 3.12,
    track: 1.77,
    length: 5.1,
    width: 2.05,
    radius: 0.45,
    suspension: 0.44,
    stiffness: 27,
    damping: 4.2,
    grip: 2.15,
    drive: '4WD',
    drag: 0.84,
    downforce: 0.15,
    steering: 0.44,
    redline: 6000,
    finalDrive: 3.6,
    gears: [3.6, 2.25, 1.58, 1.18, 0.9, 0.71],
    brake: 115,
  },
];
export const COLORS = [0xef5b25, 0xeff0e9, 0x1a4146, 0x4a87dc, 0xb32938];

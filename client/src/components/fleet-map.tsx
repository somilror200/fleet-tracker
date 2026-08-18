import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import type { Vehicle, Driver } from "@shared/schema";
import { vehicleStatusConfig, vehicleTypeLabel } from "@/lib/status";
import { Link } from "wouter";

const CENTER: [number, number] = [-37.55, 144.35];

const statusHex: Record<string, string> = {
  active: "#22c55e",
  idle: "#94a3b8",
  maintenance: "#ef4444",
};

function truckIconSvg(color: string, heading: number) {
  return `
    <div style="transform: rotate(${heading}deg); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="11" fill="${color}" fill-opacity="0.18"/>
        <path d="M12 3L19 18H5L12 3Z" fill="${color}" stroke="#0b1220" stroke-width="1"/>
      </svg>
    </div>
  `;
}

function makeIcon(status: string, heading: number) {
  const color = statusHex[status] ?? "#94a3b8";
  return L.divIcon({
    html: truckIconSvg(color, heading),
    className: "fleet-vehicle-marker",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function FitOnce({ vehicles }: { vehicles: Vehicle[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || vehicles.length === 0) return;
    const bounds = L.latLngBounds(vehicles.map((v) => [v.lat, v.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    fitted.current = true;
  }, [map, vehicles]);

  return null;
}

export function FleetMap({
  vehicles,
  drivers,
  interactiveLinks = true,
  fitBounds = true,
  className = "h-full w-full",
}: {
  vehicles: Vehicle[];
  drivers?: Driver[];
  interactiveLinks?: boolean;
  fitBounds?: boolean;
  className?: string;
}) {
  const driverById = useMemo(() => {
    const map = new Map<number, Driver>();
    (drivers ?? []).forEach((d) => map.set(d.id, d));
    return map;
  }, [drivers]);

  return (
    <div className={className} data-testid="map-fleet">
      <MapContainer
        center={CENTER}
        zoom={9}
        scrollWheelZoom
        className="h-full w-full rounded-md"
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains={["a", "b", "c", "d"]}
        />
        {fitBounds && <FitOnce vehicles={vehicles} />}
        {vehicles.map((vehicle) => (
          <Marker
            key={vehicle.id}
            position={[vehicle.lat, vehicle.lng]}
            icon={makeIcon(vehicle.status, vehicle.heading)}
            data-testid={`marker-vehicle-${vehicle.id}`}
          >
            <Popup>
              <div className="min-w-[180px] space-y-1 text-sm">
                <p className="font-semibold">{vehicle.name}</p>
                <p className="text-muted-foreground">{vehicle.plate} · {vehicleTypeLabel[vehicle.type]}</p>
                <p>Status: <span className="font-medium">{vehicleStatusConfig[vehicle.status as keyof typeof vehicleStatusConfig].label}</span></p>
                <p>Speed: {Math.round(vehicle.speedKmh)} km/h</p>
                <p>Fuel: {Math.round(vehicle.fuelPercent)}%</p>
                {vehicle.driverId && driverById.get(vehicle.driverId) && (
                  <p>Driver: {driverById.get(vehicle.driverId)?.name}</p>
                )}
                {interactiveLinks && (
                  <Link href="/vehicles" className="text-primary underline text-xs">
                    View fleet details →
                  </Link>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

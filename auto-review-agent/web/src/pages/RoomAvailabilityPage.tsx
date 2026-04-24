import { useMemo, useState } from 'react';
import { Building2, CalendarClock, MapPin, RefreshCw, Users } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useRoomAvailability } from '../hooks/useSupabase';

function toDateTimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function parseFeatures(features: string[] | string | null) {
  if (!features) return [];
  if (Array.isArray(features)) return features.filter(Boolean);

  try {
    const parsed = JSON.parse(features);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean).map(String);
    }
  } catch {
    return features
      .split(',')
      .map((feature) => feature.trim())
      .filter(Boolean);
  }

  return [];
}

function formatTimeRange(startTime: string, endTime: string) {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${formatter.format(new Date(startTime))} - ${formatter.format(new Date(endTime))}`;
}

export default function RoomAvailabilityPage() {
  const [selectedTime, setSelectedTime] = useState(() => new Date());
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const { rooms, loading, error, refetch } = useRoomAvailability(selectedTime);

  const filteredRooms = useMemo(() => {
    if (!showAvailableOnly) return rooms;
    return rooms.filter((room) => room.status === 'available');
  }, [rooms, showAvailableOnly]);

  const availabilityCounts = useMemo(
    () => ({
      available: rooms.filter((room) => room.status === 'available').length,
      occupied: rooms.filter((room) => room.status === 'occupied').length,
    }),
    [rooms],
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-dark">Room Availability</h1>
          <p className="text-muted">
            Live room status based on active bookings for the selected time.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex flex-col gap-1 text-sm font-medium text-primary-dark">
            Check time
            <input
              type="datetime-local"
              value={toDateTimeLocalValue(selectedTime)}
              onChange={(event) => setSelectedTime(new Date(event.target.value))}
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-primary-dark shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-blue"
            />
          </label>
          <Button variant="outline" onClick={() => setSelectedTime(new Date())} className="gap-2 sm:mt-6">
            <CalendarClock className="h-4 w-4 text-accent-blue" />
            Now
          </Button>
          <Button variant="outline" onClick={refetch} className="gap-2 sm:mt-6" isLoading={loading}>
            <RefreshCw className="h-4 w-4 text-accent-blue" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="border-l-4 border-blue-500">
          <p className="mb-1 text-sm font-medium text-muted">Total Rooms</p>
          <h3 className="text-3xl font-bold text-primary-dark">{loading ? '-' : rooms.length}</h3>
        </Card>
        <Card className="border-l-4 border-green-500">
          <p className="mb-1 text-sm font-medium text-muted">Available</p>
          <h3 className="text-3xl font-bold text-success">{loading ? '-' : availabilityCounts.available}</h3>
        </Card>
        <Card className="border-l-4 border-red-500">
          <p className="mb-1 text-sm font-medium text-muted">Occupied</p>
          <h3 className="text-3xl font-bold text-danger">{loading ? '-' : availabilityCounts.occupied}</h3>
        </Card>
      </div>

      <Card>
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-primary-dark">Rooms</h3>
            <p className="text-sm text-muted">
              Showing {filteredRooms.length} of {rooms.length} rooms.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setShowAvailableOnly(false)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                !showAvailableOnly ? 'bg-accent-blue text-white' : 'text-muted hover:text-primary-dark'
              }`}
            >
              Show All Rooms
            </button>
            <button
              type="button"
              onClick={() => setShowAvailableOnly(true)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                showAvailableOnly ? 'bg-accent-blue text-white' : 'text-muted hover:text-primary-dark'
              }`}
            >
              Show Available Only
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-56 animate-pulse rounded-xl border border-border bg-slate-50" />
            ))}
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="rounded-lg border border-border bg-slate-50 py-12 text-center text-muted">
            No rooms match the selected filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredRooms.map((room) => {
              const features = parseFeatures(room.features);
              const isAvailable = room.status === 'available';

              return (
                <article
                  key={room.id}
                  className={`rounded-xl border bg-card p-5 card-shadow transition-transform hover:-translate-y-0.5 ${
                    isAvailable ? 'border-green-200' : 'border-red-200'
                  }`}
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-primary-dark">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-bold text-primary-dark">{room.name}</h3>
                    </div>
                    <Badge variant={isAvailable ? 'success' : 'danger'}>
                      {isAvailable ? 'Available' : 'Occupied'}
                    </Badge>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{room.location || 'Location not set'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span>{room.capacity ? `${room.capacity} people` : 'Capacity not set'}</span>
                    </div>
                  </div>

                  <div className="mt-5 flex min-h-8 flex-wrap gap-2">
                    {features.length > 0 ? (
                      features.map((feature) => (
                        <span key={feature} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                          {feature}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted">No features listed</span>
                    )}
                  </div>

                  {!isAvailable && room.currentBooking && (
                    <div className="mt-5 rounded-lg border border-red-100 bg-red-50 p-3">
                      <p className="text-xs font-semibold uppercase text-red-700">Current booking</p>
                      <p className="mt-1 font-medium text-primary-dark">
                        {formatTimeRange(room.currentBooking.start_time, room.currentBooking.end_time)}
                      </p>
                      {room.currentBooking.booked_by_name && (
                        <p className="mt-1 text-sm text-muted">Booked by {room.currentBooking.booked_by_name}</p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

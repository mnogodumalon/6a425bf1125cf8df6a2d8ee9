import { useDashboardData } from '@/hooks/useDashboardData';
import type { Restaurants } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RestaurantsDialog } from '@/components/dialogs/RestaurantsDialog';
import { StatCard } from '@/components/StatCard';
import {
  RecordOverlay,
  RecordHeader,
  RecordKeyFacts,
  RecordSection,
  RecordField,
  RecordAttachments,
  useRecordOverlayStack,
} from '@/components/widgets/RecordView';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconSearch,
  IconMapPin, IconPhone, IconWorld, IconClock, IconToolsKitchen2,
  IconLeaf,
} from '@tabler/icons-react';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

const APPGROUP_ID = '6a425bf1125cf8df6a2d8ee9';
const REPAIR_ENDPOINT = '/claude/build/repair';

const KUECHE_OPTIONS = LOOKUP_OPTIONS['restaurants']?.['kuechenstil'] ?? [];
const ERNAEHRUNG_OPTIONS = LOOKUP_OPTIONS['restaurants']?.['ernaehrungsfilter'] ?? [];

const DAYS: { key: keyof Restaurants['fields']; label: string }[] = [
  { key: 'oeffnungszeiten_mo', label: 'Mo' },
  { key: 'oeffnungszeiten_di', label: 'Di' },
  { key: 'oeffnungszeiten_mi', label: 'Mi' },
  { key: 'oeffnungszeiten_do', label: 'Do' },
  { key: 'oeffnungszeiten_fr', label: 'Fr' },
  { key: 'oeffnungszeiten_sa', label: 'Sa' },
  { key: 'oeffnungszeiten_so', label: 'So' },
];

export default function DashboardOverview() {
  const { restaurants, loading, error, fetchAll } = useDashboardData();

  const [search, setSearch] = useState('');
  const [kueche, setKueche] = useState<string>('');
  const [ernaehrung, setErnaehrung] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Restaurants | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Restaurants | null>(null);

  const overlay = useRecordOverlayStack<Restaurants>();

  // ALL hooks BEFORE early returns
  const filtered = useMemo(() => {
    return restaurants.filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (r.fields.name ?? '').toLowerCase().includes(q) ||
        (r.fields.stadt ?? '').toLowerCase().includes(q) ||
        (r.fields.beschreibung ?? '').toLowerCase().includes(q);
      const matchKueche = !kueche || r.fields.kuechenstil?.key === kueche;
      const matchErnaehrung = !ernaehrung ||
        (r.fields.ernaehrungsfilter ?? []).some(e => e.key === ernaehrung);
      return matchSearch && matchKueche && matchErnaehrung;
    });
  }, [restaurants, search, kueche, ernaehrung]);

  const stats = useMemo(() => {
    const byKueche: Record<string, number> = {};
    restaurants.forEach(r => {
      const k = r.fields.kuechenstil?.label ?? 'Unbekannt';
      byKueche[k] = (byKueche[k] ?? 0) + 1;
    });
    const topKueche = Object.entries(byKueche).sort((a, b) => b[1] - a[1])[0];
    const veganCount = restaurants.filter(r =>
      (r.fields.ernaehrungsfilter ?? []).some(e => e.key === 'vegan')
    ).length;
    return { total: restaurants.length, topKueche: topKueche?.[0] ?? '—', veganCount };
  }, [restaurants]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteRestaurant(deleteTarget.record_id);
    setDeleteTarget(null);
    fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Restaurant Finder</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{stats.total} Restaurants gespeichert</p>
        </div>
        <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }} className="shrink-0">
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          Restaurant hinzufügen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          title="Restaurants gesamt"
          value={String(stats.total)}
          description="In der Datenbank"
          icon={<IconToolsKitchen2 size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Beliebteste Küche"
          value={stats.topKueche}
          description="Meiste Einträge"
          icon={<IconToolsKitchen2 size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Vegan-freundlich"
          value={String(stats.veganCount)}
          description="Mit veganer Option"
          icon={<IconLeaf size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name, Stadt, Beschreibung…"
            className="pl-8"
          />
        </div>
        <select
          value={kueche}
          onChange={e => setKueche(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[140px]"
        >
          <option value="">Alle Küchen</option>
          {KUECHE_OPTIONS.map(o => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
        <select
          value={ernaehrung}
          onChange={e => setErnaehrung(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[140px]"
        >
          <option value="">Alle Ernährungsarten</option>
          {ERNAEHRUNG_OPTIONS.map(o => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Gallery Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <IconToolsKitchen2 size={48} className="text-muted-foreground" stroke={1.5} />
          <p className="font-medium text-foreground">Keine Restaurants gefunden</p>
          <p className="text-sm text-muted-foreground">Passe deine Filter an oder füge ein neues Restaurant hinzu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(r => (
            <RestaurantTile
              key={r.record_id}
              restaurant={r}
              onOpen={() => overlay.replace(r)}
              onEdit={e => { e.stopPropagation(); setEditRecord(r); setDialogOpen(true); }}
              onDelete={e => { e.stopPropagation(); setDeleteTarget(r); }}
            />
          ))}
        </div>
      )}

      {/* Record Overlay */}
      <RecordOverlay
        open={overlay.open}
        onClose={overlay.close}
        onEdit={() => { setEditRecord(overlay.current ?? null); setDialogOpen(true); }}
        placement="side"
        size="md"
        media={
          overlay.current?.fields.foto ? (
            <MediaThumbnail
              src={overlay.current.fields.foto}
              alt={overlay.current.fields.name ?? ''}
              className="w-full h-56 object-cover rounded-xl"
            />
          ) : undefined
        }
      >
        {overlay.current && (
          <RestaurantDetail restaurant={overlay.current} />
        )}
      </RecordOverlay>

      {/* Create/Edit Dialog */}
      <RestaurantsDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={async fields => {
          if (editRecord) {
            await LivingAppsService.updateRestaurant(editRecord.record_id, fields);
          } else {
            await LivingAppsService.createRestaurant(fields);
          }
          fetchAll();
        }}
        defaultValues={editRecord?.fields}
        recordId={editRecord?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Restaurants']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Restaurants']}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Restaurant löschen"
        description={`"${deleteTarget?.fields.name ?? 'Dieses Restaurant'}" wirklich löschen?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// ── Restaurant Tile ────────────────────────────────────────────────────────────
interface TileProps {
  restaurant: Restaurants;
  onOpen: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

function RestaurantTile({ restaurant: r, onOpen, onEdit, onDelete }: TileProps) {
  const hasDietary = (r.fields.ernaehrungsfilter ?? []).length > 0;

  return (
    <div
      onClick={onOpen}
      className="group relative bg-card border border-border rounded-2xl overflow-hidden cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
    >
      {/* Photo */}
      <div className="aspect-video w-full bg-muted overflow-hidden">
        {r.fields.foto ? (
          <img
            src={r.fields.foto}
            alt={r.fields.name ?? ''}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-accent/30">
            <IconToolsKitchen2 size={32} className="text-muted-foreground" stroke={1.5} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate min-w-0">
            {r.fields.name ?? 'Unbekanntes Restaurant'}
          </h3>
          {r.fields.kuechenstil && (
            <Badge variant="secondary" className="text-xs shrink-0 whitespace-nowrap">
              {r.fields.kuechenstil.label}
            </Badge>
          )}
        </div>

        {(r.fields.stadt || r.fields.strasse) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 min-w-0">
            <IconMapPin size={12} className="shrink-0" />
            <span className="truncate">
              {[r.fields.strasse, r.fields.hausnummer, r.fields.stadt].filter(Boolean).join(' ')}
            </span>
          </p>
        )}

        {r.fields.beschreibung && (
          <p className="text-xs text-muted-foreground line-clamp-2">{r.fields.beschreibung}</p>
        )}

        {hasDietary && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {(r.fields.ernaehrungsfilter ?? []).map(e => (
              <span key={e.key} className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-700 font-medium">
                {e.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg bg-white/90 shadow-sm hover:bg-white text-foreground transition-colors"
          title="Bearbeiten"
        >
          <IconPencil size={13} />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg bg-white/90 shadow-sm hover:bg-red-50 text-destructive transition-colors"
          title="Löschen"
        >
          <IconTrash size={13} />
        </button>
      </div>
    </div>
  );
}

// ── Restaurant Detail (inside overlay) ────────────────────────────────────────
function RestaurantDetail({ restaurant: r }: { restaurant: Restaurants }) {
  const address = [r.fields.strasse, r.fields.hausnummer, r.fields.plz, r.fields.stadt]
    .filter(Boolean).join(' ');

  const keyFacts: { label: string; value: string }[] = [];
  if (r.fields.kuechenstil) keyFacts.push({ label: 'Küchenstil', value: r.fields.kuechenstil.label });
  if (address) keyFacts.push({ label: 'Adresse', value: address });
  if (r.fields.telefon) keyFacts.push({ label: 'Telefon', value: r.fields.telefon });

  const hasOpeningHours = DAYS.some(d => r.fields[d.key]);

  return (
    <>
      <RecordHeader
        title={r.fields.name ?? 'Restaurant'}
        subtitle={r.fields.beschreibung}
        badges={
          (r.fields.ernaehrungsfilter ?? []).length > 0
            ? (r.fields.ernaehrungsfilter ?? []).map(e => e.label)
            : undefined
        }
        meta={address ? <span className="flex items-center gap-1 text-sm text-muted-foreground"><IconMapPin size={14} className="shrink-0" />{address}</span> : undefined}
      />

      {keyFacts.length > 0 && (
        <RecordKeyFacts items={keyFacts} />
      )}

      <RecordSection title="Kontakt & Lage" icon={IconPhone} cols={2}>
        <RecordField label="Adresse" value={address} hideEmpty />
        <RecordField label="Telefon" value={r.fields.telefon} format="text" hideEmpty />
        <RecordField label="Website" value={r.fields.website} format="url" hideEmpty />
        <RecordField label="Küchenstil" value={r.fields.kuechenstil?.label} format="pill" hideEmpty />
        {(r.fields.ernaehrungsfilter ?? []).length > 0 && (
          <RecordField label="Ernährungsfilter" hideEmpty={false}>
            <div className="flex flex-wrap gap-1 mt-1">
              {(r.fields.ernaehrungsfilter ?? []).map(e => (
                <span key={e.key} className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-700 font-medium">
                  {e.label}
                </span>
              ))}
            </div>
          </RecordField>
        )}
      </RecordSection>

      {hasOpeningHours && (
        <RecordSection title="Öffnungszeiten" icon={IconClock} cols={2}>
          {DAYS.map(d => (
            r.fields[d.key] ? (
              <RecordField key={d.key} label={d.label} value={r.fields[d.key] as string} hideEmpty />
            ) : null
          ))}
        </RecordSection>
      )}

      {r.fields.standort && (
        <RecordSection title="Standort auf der Karte" icon={IconWorld} cols={1}>
          <RecordField label="Koordinaten" hideEmpty={false}>
            <span className="text-sm text-muted-foreground">
              {r.fields.standort.lat.toFixed(5)}, {r.fields.standort.long.toFixed(5)}
              {r.fields.standort.info ? ` — ${r.fields.standort.info}` : ''}
            </span>
          </RecordField>
        </RecordSection>
      )}

      <RecordAttachments appId={APP_IDS.RESTAURANTS} recordId={r.record_id} />
    </>
  );
}

// ── Skeleton & Error ─────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}

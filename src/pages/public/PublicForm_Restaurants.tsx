import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconChevronDown, IconCrosshair, IconLoader2 } from '@tabler/icons-react';
import { GeoMapPicker } from '@/components/GeoMapPicker';
import { lookupKey, lookupKeys } from '@/lib/formatters';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a425bdddfb17b839e346e0f';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Submission failed');
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormRestaurants() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaRef = useRef<HTMLElement | null>(null);
  const [locating, setLocating] = useState(false);
  const [showCoords, setShowCoords] = useState(false);
  const [geoFromPhoto, setGeoFromPhoto] = useState(false);

  async function geoLocate(fieldKey: string) {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setFields((f: Record<string, any>) => ({ ...f, [fieldKey]: { lat: pos.coords.latitude, long: pos.coords.longitude, info: '' } }));
        setLocating(false);
      },
      () => setLocating(false)
    );
  }

  function handleMapMove(fieldKey: string, lat: number, lng: number) {
    setFields((f: Record<string, any>) => ({ ...f, [fieldKey]: { ...(f[fieldKey] ?? {}), lat, long: lng } }));
  }

  void geoFromPhoto; void setGeoFromPhoto;

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError('Bitte warte auf die Spam-Prüfung und versuche es erneut.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Eingabe wurde erfolgreich übermittelt.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            Weitere Eingabe
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Restaurants — Formular</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="name">Name des Restaurants</Label>
            <Input
              id="name"
              placeholder=""
              value={fields.name ?? ''}
              onChange={e => setFields(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Kurzbeschreibung</Label>
            <Textarea
              id="beschreibung"
              placeholder=""
              value={fields.beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="strasse">Straße</Label>
            <Input
              id="strasse"
              placeholder=""
              value={fields.strasse ?? ''}
              onChange={e => setFields(f => ({ ...f, strasse: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hausnummer">Hausnummer</Label>
            <Input
              id="hausnummer"
              placeholder=""
              value={fields.hausnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, hausnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plz">Postleitzahl</Label>
            <Input
              id="plz"
              placeholder=""
              value={fields.plz ?? ''}
              onChange={e => setFields(f => ({ ...f, plz: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stadt">Stadt</Label>
            <Input
              id="stadt"
              placeholder=""
              value={fields.stadt ?? ''}
              onChange={e => setFields(f => ({ ...f, stadt: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="standort">Standort auf der Karte</Label>
            <div className="space-y-3">
              <Button type="button" variant="outline" className="w-full" disabled={locating} onClick={() => geoLocate("standort")}>
                {locating ? <IconLoader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <IconCrosshair className="h-4 w-4 mr-1.5" />}
                Aktuellen Standort verwenden
              </Button>
              {geoFromPhoto && fields.standort && (
                <p className="text-xs text-primary italic">Standort aus Foto übernommen</p>
              )}
              {fields.standort?.info && (
                <p className="text-sm text-muted-foreground break-words whitespace-normal">
                  {fields.standort.info}
                </p>
              )}
              {fields.standort?.lat != null && fields.standort?.long != null && (
                <GeoMapPicker
                  lat={fields.standort.lat}
                  lng={fields.standort.long}
                  onChange={(lat, lng) => handleMapMove("standort", lat, lng)}
                />
              )}
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" onClick={() => setShowCoords(v => !v)}>
                {showCoords ? 'Koordinaten verbergen' : 'Koordinaten anzeigen'}
                <IconChevronDown className={`h-3 w-3 transition-transform ${showCoords ? "rotate-180" : ""}`} />
              </button>
              {showCoords && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Breitengrad</Label>
                    <Input type="number" step="any"
                      value={fields.standort?.lat ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setFields(f => ({ ...f, standort: { ...(f.standort as any ?? {}), lat: v ? Number(v) : undefined } }));
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Längengrad</Label>
                    <Input type="number" step="any"
                      value={fields.standort?.long ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setFields(f => ({ ...f, standort: { ...(f.standort as any ?? {}), long: v ? Number(v) : undefined } }));
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefon">Telefonnummer</Label>
            <Input
              id="telefon"
              value={fields.telefon ?? ''}
              onChange={e => setFields(f => ({ ...f, telefon: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={fields.website ?? ''}
              onChange={e => setFields(f => ({ ...f, website: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oeffnungszeiten_mo">Montag</Label>
            <Input
              id="oeffnungszeiten_mo"
              placeholder=""
              value={fields.oeffnungszeiten_mo ?? ''}
              onChange={e => setFields(f => ({ ...f, oeffnungszeiten_mo: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oeffnungszeiten_di">Dienstag</Label>
            <Input
              id="oeffnungszeiten_di"
              placeholder=""
              value={fields.oeffnungszeiten_di ?? ''}
              onChange={e => setFields(f => ({ ...f, oeffnungszeiten_di: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oeffnungszeiten_mi">Mittwoch</Label>
            <Input
              id="oeffnungszeiten_mi"
              placeholder=""
              value={fields.oeffnungszeiten_mi ?? ''}
              onChange={e => setFields(f => ({ ...f, oeffnungszeiten_mi: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oeffnungszeiten_do">Donnerstag</Label>
            <Input
              id="oeffnungszeiten_do"
              placeholder=""
              value={fields.oeffnungszeiten_do ?? ''}
              onChange={e => setFields(f => ({ ...f, oeffnungszeiten_do: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oeffnungszeiten_fr">Freitag</Label>
            <Input
              id="oeffnungszeiten_fr"
              placeholder=""
              value={fields.oeffnungszeiten_fr ?? ''}
              onChange={e => setFields(f => ({ ...f, oeffnungszeiten_fr: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oeffnungszeiten_sa">Samstag</Label>
            <Input
              id="oeffnungszeiten_sa"
              placeholder=""
              value={fields.oeffnungszeiten_sa ?? ''}
              onChange={e => setFields(f => ({ ...f, oeffnungszeiten_sa: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oeffnungszeiten_so">Sonntag</Label>
            <Input
              id="oeffnungszeiten_so"
              placeholder=""
              value={fields.oeffnungszeiten_so ?? ''}
              onChange={e => setFields(f => ({ ...f, oeffnungszeiten_so: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kuechenstil">Küchenstil</Label>
            <Select
              value={lookupKey(fields.kuechenstil) ?? ''}
              onValueChange={v => setFields(f => ({ ...f, kuechenstil: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="kuechenstil"><SelectValue placeholder="" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="italienisch">Italienisch</SelectItem>
                <SelectItem value="asiatisch">Asiatisch</SelectItem>
                <SelectItem value="deutsch">Deutsch</SelectItem>
                <SelectItem value="griechisch">Griechisch</SelectItem>
                <SelectItem value="indisch">Indisch</SelectItem>
                <SelectItem value="japanisch">Japanisch</SelectItem>
                <SelectItem value="mexikanisch">Mexikanisch</SelectItem>
                <SelectItem value="amerikanisch">Amerikanisch</SelectItem>
                <SelectItem value="franzoesisch">Französisch</SelectItem>
                <SelectItem value="tuerkisch">Türkisch</SelectItem>
                <SelectItem value="mediterran">Mediterran</SelectItem>
                <SelectItem value="vietnamesisch">Vietnamesisch</SelectItem>
                <SelectItem value="thailaendisch">Thailändisch</SelectItem>
                <SelectItem value="spanisch">Spanisch</SelectItem>
                <SelectItem value="sonstige">Sonstige</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ernaehrungsfilter">Ernährungsfilter</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ernaehrungsfilter_vegan"
                  checked={lookupKeys(fields.ernaehrungsfilter).includes('vegan')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.ernaehrungsfilter);
                      const next = checked ? [...current, 'vegan'] : current.filter(k => k !== 'vegan');
                      return { ...f, ernaehrungsfilter: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="ernaehrungsfilter_vegan" className="font-normal">Vegan</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ernaehrungsfilter_vegetarisch"
                  checked={lookupKeys(fields.ernaehrungsfilter).includes('vegetarisch')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.ernaehrungsfilter);
                      const next = checked ? [...current, 'vegetarisch'] : current.filter(k => k !== 'vegetarisch');
                      return { ...f, ernaehrungsfilter: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="ernaehrungsfilter_vegetarisch" className="font-normal">Vegetarisch</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ernaehrungsfilter_glutenfrei"
                  checked={lookupKeys(fields.ernaehrungsfilter).includes('glutenfrei')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.ernaehrungsfilter);
                      const next = checked ? [...current, 'glutenfrei'] : current.filter(k => k !== 'glutenfrei');
                      return { ...f, ernaehrungsfilter: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="ernaehrungsfilter_glutenfrei" className="font-normal">Glutenfrei</Label>
              </div>
            </div>
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Wird gesendet...' : 'Absenden'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Powered by Klar
        </p>
      </div>
    </div>
  );
}

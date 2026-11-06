import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useStore, useLookup } from '../store/store';
import { PageHead } from '../components/blocks';
import { Crest, StadiumIcon } from '../components/ui';
import { fmtDateTime, mapsEmbed, mapsUrl } from '../format';
import { isUpcoming } from '../data/rules';

export default function Venues() {
  const { db } = useStore();
  const L = useLookup();
  // Arriving from search (?venue=…): scroll to that stadium and highlight it.
  const [params] = useSearchParams();
  const focusId = params.get('venue');
  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(focusId);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [focusId]);
  return (
    <>
      <PageHead kicker="Getting there" title="Venues" sub="Stadiums, addresses, transit and parking — plus every upcoming match at each ground." />
      <section className="section">
        <div className="container grid grid-2">
          {db.venues.map((v) => {
            const upcoming = db.matches.filter((m) => m.venueId === v.id && isUpcoming(m)).sort((a, b) => a.kickoff.localeCompare(b.kickoff)).slice(0, 3);
            const tenants = db.teams.filter((t) => t.homeVenueId === v.id);
            return (
              <div className={`card venue-card ${focusId === v.id ? 'venue-focus' : ''}`} key={v.id} id={v.id}>
                <div className="venue-top">
                  <div className="row-between">
                    <div>
                      <h3 className="row" style={{ margin: 0 }}><span className="venue-badge venue-badge-dark"><StadiumIcon size={18} /></span>{v.name}</h3>
                      <div className="muted-light small">{v.city} · {v.capacity.toLocaleString()} seats</div>
                    </div>
                    <div className="row">{tenants.map((t) => <Crest key={t.id} team={t} size={34} />)}</div>
                  </div>
                </div>
                <iframe className="map-frame" style={{ borderRadius: 0 }} src={mapsEmbed(`${v.name} ${v.address}`)} title={`Map of ${v.name}`} loading="lazy" />
                <div className="card-pad">
                  <div className="info-list">
                    <div><span>📍</span><span>{v.address}</span></div>
                    <div><span>🚇</span><span>{v.transit}</span></div>
                    <div><span>🅿️</span><span>{v.parking}</span></div>
                    <div><span>🌱</span><span>{v.surface}</span></div>
                  </div>
                  {upcoming.length > 0 && (
                    <>
                      <div className="divider" />
                      <div className="kicker" style={{ color: 'var(--muted)' }}>Upcoming here</div>
                      {upcoming.map((m) => (
                        <Link key={m.id} to={`/matches/${m.id}`} className="row-between" style={{ padding: '6px 0' }}>
                          <span className="row"><Crest team={L.team(m.homeId)} label={m.homeLabel} size={20} /><b>{L.team(m.homeId)?.short ?? m.homeLabel}</b> v <b>{L.team(m.awayId)?.short ?? m.awayLabel}</b><Crest team={L.team(m.awayId)} label={m.awayLabel} size={20} /></span>
                          <span className="muted small">{fmtDateTime(m.kickoff)}</span>
                        </Link>
                      ))}
                    </>
                  )}
                  <a href={mapsUrl(`${v.name}, ${v.address}`)} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>Get directions</a>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

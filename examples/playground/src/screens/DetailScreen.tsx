import type { ScreenComponentProps } from 'rehynav';
import { useIsFocused, useNavigation, useRoute } from 'rehynav';

export function DetailScreen({ params }: ScreenComponentProps<{ id: string }>) {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();

  return (
    <div className="screen">
      <header className="screen-header">
        <button type="button" className="back-btn" onClick={() => navigation.goBack()}>
          Back
        </button>
        <h1>Detail: {params.id}</h1>
      </header>

      <div className="section">
        <div className="section-title">Screen Info</div>
        <div className="info-row">
          <span className="info-label">Route</span>
          <span className="info-value">{route.name}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Params</span>
          <span className="info-value">{JSON.stringify(route.params)}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Is Focused</span>
          <span className="info-value">{isFocused ? 'Yes' : 'No'}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Can Go Back</span>
          <span className="info-value">{navigation.canGoBack() ? 'Yes' : 'No'}</span>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Actions</div>
        <div className="action-list">
          <button
            type="button"
            className="btn"
            onClick={() => navigation.push('home/detail/:id', { id: `${params.id}-child` })}
          >
            push deeper detail
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => navigation.replace('home/detail/:id', { id: 'replaced' })}
          >
            replace with detail/replaced
          </button>
          <button type="button" className="btn" onClick={() => navigation.pop()}>
            pop()
          </button>
          <button type="button" className="btn" onClick={() => navigation.popToRoot()}>
            popToRoot()
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigation.goBack()}>
            goBack()
          </button>
        </div>
      </div>
    </div>
  );
}

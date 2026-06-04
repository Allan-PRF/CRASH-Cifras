import { PageBackButton } from './PageBackButton'
import { PageBreadcrumb } from './PageBreadcrumb'

/** Breadcrumb + botão Voltar acima do conteúdo. */
export function PageNav({ breadcrumbItems, backTo, backLabel, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      <PageBreadcrumb items={breadcrumbItems} />
      <PageBackButton to={backTo} label={backLabel} />
    </div>
  )
}

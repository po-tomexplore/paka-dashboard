import './Footer.css'

export const Footer = () => {
  return (
    <footer className="footer">
      <p>Données via Weezevent API • Dernière mise à jour: {new Date().toLocaleString('fr-FR')}</p>
    </footer>
  )
}

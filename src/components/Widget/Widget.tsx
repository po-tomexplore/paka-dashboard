import { useEffect } from 'react'

function Widget() {
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://media.tomexplore.com/widget/widget-1.min.js'
    script.defer = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  return (
    <div
      id="tomexplore-widget"
      data-city="vannes"
      data-width="800px"
      data-height="500px"
      data-forcecity="false"
    ></div>
  )
}

export default Widget

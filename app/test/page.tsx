export default function TestPage() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Hello World</h1>
      <p>אם אתה רואה את זה, הדף עובד!</p>
      <p>Current time: {new Date().toLocaleString('he-IL')}</p>
    </div>
  )
}

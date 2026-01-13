// Quick test harness to verify radial pass calculations
function compute(threadMillDiameter, majorDiameter, passes, nominalRadialStep = 1) {
  const toolRadius = threadMillDiameter / 2
  const majorRadius = majorDiameter / 2
  const pathRadius = majorRadius - toolRadius
  const radialCutAmount = toolRadius
  let radialStep = radialCutAmount / passes
  const maxStep = Math.abs(nominalRadialStep)
  radialStep = Math.min(Math.abs(radialStep), maxStep)
  const iValue = Math.abs(nominalRadialStep) / passes
  const radii = Array.from({ length: passes }, (_, i) => pathRadius - i * radialStep)
  radii.sort((a, b) => Math.abs(a) - Math.abs(b))
  return { toolRadius, majorRadius, pathRadius, radialCutAmount, radialStep, iValue, radii }
}

function printCase(threadMillDiameter, majorDiameter, passes) {
  const res = compute(threadMillDiameter, majorDiameter, passes)
  console.log(`\nCase: toolDia=${threadMillDiameter}, majorDia=${majorDiameter}, passes=${passes}`)
  console.log('toolRadius:', res.toolRadius)
  console.log('majorRadius:', res.majorRadius)
  console.log('pathRadius:', res.pathRadius)
  console.log('radialCutAmount:', res.radialCutAmount)
  console.log('radialStep:', res.radialStep)
  console.log('iValue:', res.iValue)
  console.log('radii:', res.radii.map(r => r.toFixed(6)).join(', '))
}

printCase(0.4, 0.5, 1)
printCase(0.4, 0.5, 2)
printCase(0.4, 0.5, 3)
printCase(0.25, 0.6, 3)
printCase(0.4, 1.5, 4)

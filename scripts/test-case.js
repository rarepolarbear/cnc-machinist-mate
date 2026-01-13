// Test case per user: tool radius 0.125, minorDia 0.201, majorDia 0.25, depth 0.4, passes 4
(function(){
  const toolRadius = 0.125
  const threadMillDiameter = toolRadius * 2
  const minorDiameter = 0.201
  const majorDiameter = 0.25
  const threadDepth = 0.4
  const passes = 4
  const nominalRadialStep = 1

  const majorRadius = majorDiameter / 2
  const pathRadius = majorRadius - toolRadius
  const radialCutAmount = toolRadius
  let radialStep = radialCutAmount / passes
  const maxStep = Math.abs(nominalRadialStep)
  radialStep = Math.min(Math.abs(radialStep), maxStep)
  const iValue = Math.abs(nominalRadialStep) / passes
  const radii = Array.from({ length: passes }, (_, i) => Math.abs(pathRadius - i * radialStep)).sort((a,b) => a - b)

  console.log('Test case:')
  console.log('toolRadius:', toolRadius)
  console.log('threadMillDiameter:', threadMillDiameter)
  console.log('minorDiameter:', minorDiameter)
  console.log('majorDiameter:', majorDiameter)
  console.log('threadDepth:', threadDepth)
  console.log('passes:', passes)
  console.log('majorRadius:', majorRadius)
  console.log('pathRadius:', pathRadius)
  console.log('radialCutAmount:', radialCutAmount)
  console.log('radialStep (per code):', radialStep)
  console.log('iValue (I param):', iValue)
  console.log('radii (sorted ascending):', radii.map(r => r.toFixed(6)).join(', '))
})();

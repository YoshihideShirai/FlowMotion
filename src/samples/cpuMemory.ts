export const cpuMemorySample = `title "CPU Memory Read"

cpu CPU
memory RAM

CPU -> RAM : Read
RAM --> CPU : Data

timeline:
  0s: show CPU
  1s: show RAM
  2s: grow CPU_RAM
  3s: highlight CPU red
  4s: highlight RAM yellow
  5s: text "CPU reads data from memory"`;

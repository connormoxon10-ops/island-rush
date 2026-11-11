#!/bin/bash
cd "$(dirname "$0")"
rm -f flight.done
for id in meridian gull wren talon sparrow vixen; do
  for k in fp fl; do
    timeout 250 node run3f.js low "$(cat ${k}_${id}.json)" > flight_${k}_${id}.log 2>&1
    echo "${k}_${id} exit $?" >> flight.done
  done
done
echo ALL >> flight.done

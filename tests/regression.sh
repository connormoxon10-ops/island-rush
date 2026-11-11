#!/bin/bash
cd "$(dirname "$0")"
rm -f regression.done
for t in rg1 tw1 skip pf1 bu19 ct1 rel3 fly_flow fp_sparrow fl_sparrow ven_all col2; do
  timeout 280 node run3f.js low "$(cat $t.json)" > reg_$t.log 2>&1
  echo "$t exit $?" >> regression.done
done
echo ALL >> regression.done

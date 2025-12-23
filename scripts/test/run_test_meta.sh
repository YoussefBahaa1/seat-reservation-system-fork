#/bin/bash
for i in {1..25}; do
  echo "${i}th iteration"
  ./scripts/test/run_test.sh "$1"
done
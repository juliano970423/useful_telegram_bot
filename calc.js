const math = require("mathjs")
const parser = math.parser()
function calc(expression) {
  return parser.evaluate(expression)
}
module.exports = {
  calc
};